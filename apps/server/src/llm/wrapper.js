'use strict';

const path = require('path');

const audit = require('./audit');
const cache = require('./cache');
const askOpenAI = require('./providers/openai');

const forbiddenWords = require(path.resolve(process.cwd(), 'demo/critiques/pool.json')).meta.forbiddenWords || [];
const DEFAULT_MAX_INPUT_TOKENS = parseInt(process.env.LLM_MAX_IN_TOKENS || '2000', 10);
const DEFAULT_MAX_OUTPUT_TOKENS = parseInt(process.env.LLM_MAX_OUT_TOKENS || '200', 10);
const DEFAULT_SYSTEM_PROMPT = 'You help drive a small multiplayer art game. Reply with one concise plain-text line.';
const RETRY_DELAYS_MS = [0, 200, 500, 1200];

function createAbortError(timeoutMs) {
    const error = new Error('Timed out after ' + timeoutMs + 'ms');
    error.name = 'AbortError';
    return error;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function acceptResponse(text) {
    if (!text || text.length < 6 || text.length > 200) {
        return false;
    }

    return !forbiddenWords.some((badWord) => text.includes(badWord));
}

function createMockProvider(promptId, _params, options) {
    const delayMs = typeof options.mockDelayMs === 'number' ? options.mockDelayMs : 5;
    const text = typeof options.mockText === 'string' ? options.mockText : 'MOCK:' + promptId;

    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            resolve({
                text: text,
                tokenIn: 0,
                tokenOut: 0
            });
        }, delayMs);

        if (options.signal && typeof options.signal.addEventListener === 'function') {
            options.signal.addEventListener('abort', () => {
                clearTimeout(timer);
                reject(createAbortError(options.timeoutMs));
            }, { once: true });
        }
    });
}

function getProvider(options) {
    if (typeof options.providerFn === 'function') {
        return options.providerFn;
    }

    const provider = String(options.provider || process.env.LLM_PROVIDER || 'mock').toLowerCase();

    if (provider === 'mock') {
        return createMockProvider;
    }

    if (provider === 'openai') {
        return function openAiProvider(promptId, params, providerOptions) {
            return askOpenAI(buildPromptRequest(promptId, params, providerOptions));
        };
    }

    return function unsupportedProvider() {
        return Promise.reject(new Error('Unsupported LLM provider: ' + provider));
    };
}

function approximateTokenCount(text) {
    if (!text) {
        return 0;
    }

    return Math.ceil(String(text).length / 3.5);
}

function buildPromptRequest(promptId, params, options) {
    const prompt = options.prompt || {};
    const serializedParams = JSON.stringify(params || {}, null, 2);

    return {
        system: typeof prompt.system === 'string'
            ? prompt.system
            : (typeof options.system === 'string' ? options.system : DEFAULT_SYSTEM_PROMPT),
        user: typeof prompt.user === 'string'
            ? prompt.user
            : (typeof options.user === 'string'
                ? options.user
                : [
                    'promptId: ' + promptId,
                    'params:',
                    serializedParams,
                    'Reply with one concise plain-text response that fits this prompt.'
                ].join('\n')),
        maxTokens: typeof prompt.maxTokens === 'number'
            ? prompt.maxTokens
            : (typeof options.maxTokens === 'number' ? options.maxTokens : DEFAULT_MAX_OUTPUT_TOKENS),
        temperature: typeof prompt.temperature === 'number'
            ? prompt.temperature
            : (typeof options.temperature === 'number' ? options.temperature : 0.7),
        signal: options.signal,
        model: options.model || process.env.LLM_MODEL,
        apiKey: options.apiKey,
        baseURL: options.baseURL || process.env.OPENAI_BASE_URL
    };
}

function withTimeout(taskFactory, timeoutMs) {
    const controller = new AbortController();
    let timeoutHandle = null;
    const timeoutPromise = new Promise((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
            controller.abort();
            reject(createAbortError(timeoutMs));
        }, timeoutMs);
    });

    return Promise.race([
        Promise.resolve().then(() => taskFactory(controller.signal)),
        timeoutPromise
    ]).finally(() => {
        clearTimeout(timeoutHandle);
    });
}

function buildResult(base) {
    return Object.assign({
        ok: false,
        promptId: '',
        text: '',
        source: 'fallback',
        elapsedMs: 0,
        tokenIn: 0,
        tokenOut: 0
    }, base || {});
}

function createAuditEntry(promptId, params, result) {
    return {
        ts: Date.now(),
        promptId: promptId,
        params: params || {},
        text: result.text,
        source: result.source,
        elapsedMs: result.elapsedMs,
        tokenIn: result.tokenIn,
        tokenOut: result.tokenOut
    };
}

async function ask(promptId, params, opts) {
    const startedAt = Date.now();
    const options = Object.assign({
        timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '5000', 10),
        useCache: true
    }, opts || {});
    const safeParams = params || {};
    const cacheKey = cache.createCacheKey(promptId, safeParams);

    if (options.useCache !== false) {
        const cached = cache.get(cacheKey);
        if (cached) {
            const cacheResult = buildResult({
                ok: true,
                promptId: promptId,
                text: cached.text,
                source: 'cache',
                elapsedMs: Date.now() - startedAt
            });

            audit.append(createAuditEntry(promptId, safeParams, cacheResult));
            return cacheResult;
        }
    }

    const provider = getProvider(options);
    const promptRequest = buildPromptRequest(promptId, safeParams, options);
    const estimatedInputTokens = approximateTokenCount(promptRequest.system + '\n' + promptRequest.user);
    if (estimatedInputTokens > DEFAULT_MAX_INPUT_TOKENS) {
        const budgetResult = buildResult({
            promptId: promptId,
            elapsedMs: Date.now() - startedAt,
            reason: 'input_budget'
        });
        audit.append(createAuditEntry(promptId, safeParams, budgetResult));
        return budgetResult;
    }

    let lastError = null;

    for (let attemptIndex = 0; attemptIndex < RETRY_DELAYS_MS.length; attemptIndex += 1) {
        if (attemptIndex > 0) {
            await sleep(RETRY_DELAYS_MS[attemptIndex]);
        }

        try {
            const providerResponse = await withTimeout((signal) => provider(promptId, safeParams, Object.assign({}, options, {
                signal: signal,
                prompt: promptRequest
            })), options.timeoutMs);
            const text = providerResponse && typeof providerResponse.text === 'string' ? providerResponse.text : '';
            const result = buildResult({
                ok: true,
                promptId: promptId,
                text: text,
                source: 'llm',
                elapsedMs: Date.now() - startedAt,
                tokenIn: providerResponse && providerResponse.tokenIn ? providerResponse.tokenIn : 0,
                tokenOut: providerResponse && providerResponse.tokenOut ? providerResponse.tokenOut : 0
            });

            if (!acceptResponse(text)) {
                const rejectedResult = buildResult({
                    promptId: promptId,
                    elapsedMs: result.elapsedMs
                });
                audit.append(createAuditEntry(promptId, safeParams, rejectedResult));
                return rejectedResult;
            }

            if (options.useCache !== false) {
                cache.set(cacheKey, text);
            }

            audit.append(createAuditEntry(promptId, safeParams, result));
            return result;
        } catch (error) {
            lastError = error;
        }
    }

    const fallbackResult = buildResult({
        promptId: promptId,
        elapsedMs: Date.now() - startedAt
    });

    if (lastError && lastError.name === 'AbortError') {
        fallbackResult.reason = 'timeout';
    }

    audit.append(createAuditEntry(promptId, safeParams, fallbackResult));
    return fallbackResult;
}

module.exports = {
    ask: ask,
    acceptResponse: acceptResponse,
    buildPromptRequest: buildPromptRequest
};
