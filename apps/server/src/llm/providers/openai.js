'use strict';

const OpenAI = require('openai');

const OpenAIClient = OpenAI.default || OpenAI;
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_SYSTEM_PROMPT = 'You help drive a small multiplayer art game. Reply with one concise plain-text line.';

function normalizeContent(content) {
    if (typeof content === 'string') {
        return content.trim();
    }

    if (!Array.isArray(content)) {
        return '';
    }

    return content.map((part) => {
        if (!part) {
            return '';
        }

        if (typeof part === 'string') {
            return part;
        }

        if (typeof part.text === 'string') {
            return part.text;
        }

        if (part.type === 'output_text' && typeof part.text === 'string') {
            return part.text;
        }

        return '';
    }).join('').trim();
}

async function askOpenAI(input) {
    const apiKey = input.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
    }

    const clientOptions = {
        apiKey: apiKey
    };
    const baseURL = input.baseURL || process.env.OPENAI_BASE_URL;
    if (baseURL) {
        clientOptions.baseURL = baseURL;
    }

    const client = new OpenAIClient(clientOptions);
    const requestBody = {
        model: input.model || process.env.LLM_MODEL || DEFAULT_MODEL,
        messages: [
            {
                role: 'developer',
                content: input.system || DEFAULT_SYSTEM_PROMPT
            },
            {
                role: 'user',
                content: input.user || ''
            }
        ],
        temperature: typeof input.temperature === 'number' ? input.temperature : 0.7
    };

    if (typeof input.maxTokens === 'number') {
        requestBody.max_tokens = input.maxTokens;
    }

    const response = await client.chat.completions.create(requestBody, {
        signal: input.signal
    });
    const choice = response && response.choices ? response.choices[0] : null;

    return {
        text: normalizeContent(choice && choice.message ? choice.message.content : ''),
        tokenIn: response && response.usage ? response.usage.prompt_tokens || 0 : 0,
        tokenOut: response && response.usage ? response.usage.completion_tokens || 0 : 0
    };
}

module.exports = askOpenAI;
module.exports.askOpenAI = askOpenAI;
