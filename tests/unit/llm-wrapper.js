/*jshint expr:true */

const expect = require('chai').expect;
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

function clearModule(modulePath) {
    try {
        delete require.cache[require.resolve(modulePath)];
    } catch (_error) {
        // Some tests run before optional provider files exist.
    }
}

function loadWrapperFixture(tmpDir, envOverrides) {
    Object.assign(process.env, {
        LLM_PROVIDER: 'mock',
        LLM_TIMEOUT_MS: '5000',
        LLM_CACHE_DB_PATH: path.join(tmpDir, 'llm-cache.sqlite3'),
        LLM_CACHE_FALLBACK_PATH: path.join(tmpDir, 'llm-cache.json'),
        LLM_AUDIT_DIR: path.join(tmpDir, 'audit')
    }, envOverrides || {});

    clearModule('../../apps/server/src/llm/cache');
    clearModule('../../apps/server/src/llm/audit');
    clearModule('../../apps/server/src/llm/providers/openai');
    clearModule('../../apps/server/src/llm/wrapper');

    return {
        cache: require('../../apps/server/src/llm/cache'),
        audit: require('../../apps/server/src/llm/audit'),
        wrapper: require('../../apps/server/src/llm/wrapper')
    };
}

function createOpenAiMockServer(responseFactory) {
    const requests = [];
    const server = http.createServer((request, response) => {
        if (request.method !== 'POST' || request.url !== '/v1/chat/completions') {
            response.writeHead(404);
            response.end('not found');
            return;
        }

        const chunks = [];
        request.on('data', (chunk) => chunks.push(chunk));
        request.on('end', () => {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            requests.push(body);

            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify(responseFactory(body, requests.length)));
        });
    });

    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({
                close() {
                    return new Promise((done) => server.close(done));
                },
                requests: requests,
                url: 'http://127.0.0.1:' + address.port + '/v1'
            });
        });
    });
}

describe('llm wrapper', () => {
    let tmpDir;
    let fixture;
    let openAiServer;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agar-llm-wrapper-'));
        fixture = loadWrapperFixture(tmpDir);
    });

    afterEach(async () => {
        fixture.cache.reset();
        delete process.env.LLM_PROVIDER;
        delete process.env.LLM_TIMEOUT_MS;
        delete process.env.LLM_CACHE_DB_PATH;
        delete process.env.LLM_CACHE_FALLBACK_PATH;
        delete process.env.LLM_AUDIT_DIR;
        delete process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_BASE_URL;
        delete process.env.LLM_MODEL;
        if (openAiServer) {
            await openAiServer.close();
            openAiServer = null;
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should return mock responses successfully', async () => {
        const result = await fixture.wrapper.ask('hello', {});

        expect(result.ok).to.equal(true);
        expect(result.text).to.equal('MOCK:hello');
        expect(result.source).to.equal('llm');
        expect(result.elapsedMs).to.be.at.least(0);

        const auditFilePath = fixture.audit.getAuditFilePath();
        expect(fs.existsSync(auditFilePath)).to.equal(true);
    });

    it('should fall back when provider execution exceeds the timeout', async function () {
        this.timeout(4000);
        const result = await fixture.wrapper.ask('slow', {}, {
            useCache: false,
            timeoutMs: 10,
            providerFn(_promptId, _params, options) {
                return new Promise((resolve, reject) => {
                    const timer = setTimeout(() => {
                        resolve({ text: '这是一条很慢的响应' });
                    }, 50);

                    options.signal.addEventListener('abort', () => {
                        clearTimeout(timer);
                        reject(new Error('aborted'));
                    }, { once: true });
                });
            }
        });

        expect(result.ok).to.equal(false);
        expect(result.source).to.equal('fallback');
    });

    it('should serve the second identical request from cache quickly', async () => {
        const firstResult = await fixture.wrapper.ask('cache-case', { value: 1 }, {
            providerFn() {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({ text: '缓存验证文本' });
                    }, 30);
                });
            }
        });

        const secondResult = await fixture.wrapper.ask('cache-case', { value: 1 }, {
            providerFn() {
                throw new Error('cache should prevent this call');
            }
        });

        expect(firstResult.source).to.equal('llm');
        expect(secondResult.ok).to.equal(true);
        expect(secondResult.source).to.equal('cache');
        expect(secondResult.text).to.equal('缓存验证文本');
        expect(secondResult.elapsedMs).to.be.below(50);
    });

    it('should reject forbidden words and fall back instead of returning them', async () => {
        const result = await fixture.wrapper.ask('unsafe', {}, {
            useCache: false,
            providerFn() {
                return Promise.resolve({ text: '这像被遗弃的梦' });
            }
        });

        expect(result.ok).to.equal(false);
        expect(result.source).to.equal('fallback');
        expect(result.text).to.equal('');
    });

    it('should handle ten concurrent requests without crashing', async () => {
        const results = await Promise.all(
            Array.from({ length: 10 }, function (_value, index) {
                return fixture.wrapper.ask('concurrent-' + index, { index: index }, {
                    useCache: false,
                    providerFn(promptId) {
                        return Promise.resolve({
                            text: '响应:' + promptId
                        });
                    }
                });
            })
        );

        expect(results).to.have.length(10);
        results.forEach((result, index) => {
            expect(result.ok).to.equal(true);
            expect(result.source).to.equal('llm');
            expect(result.text).to.equal('响应:concurrent-' + index);
        });
    });

    it('should return live OpenAI provider responses successfully', async () => {
        openAiServer = await createOpenAiMockServer(() => ({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            created: 1710000000,
            model: 'gpt-4o-mini',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: '花园里有一点蓝色回声'
                    },
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: 21,
                completion_tokens: 9,
                total_tokens: 30
            }
        }));
        fixture = loadWrapperFixture(tmpDir, {
            LLM_PROVIDER: 'openai',
            OPENAI_API_KEY: 'test-key',
            OPENAI_BASE_URL: openAiServer.url,
            LLM_MODEL: 'gpt-4o-mini'
        });

        const result = await fixture.wrapper.ask('hello', { mood: 'calm' }, {
            useCache: false
        });

        expect(result.ok).to.equal(true);
        expect(result.source).to.equal('llm');
        expect(result.text).to.equal('花园里有一点蓝色回声');
        expect(result.tokenIn).to.equal(21);
        expect(result.tokenOut).to.equal(9);
        expect(openAiServer.requests).to.have.length(1);
        expect(openAiServer.requests[0].model).to.equal('gpt-4o-mini');
    });

    it('should reject forbidden words from live OpenAI responses without retrying', async () => {
        openAiServer = await createOpenAiMockServer(() => ({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            created: 1710000000,
            model: 'gpt-4o-mini',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: '这像被遗弃的云'
                    },
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: 20,
                completion_tokens: 8,
                total_tokens: 28
            }
        }));
        fixture = loadWrapperFixture(tmpDir, {
            LLM_PROVIDER: 'openai',
            OPENAI_API_KEY: 'test-key',
            OPENAI_BASE_URL: openAiServer.url,
            LLM_MODEL: 'gpt-4o-mini'
        });

        const result = await fixture.wrapper.ask('hello', { mood: 'unsafe' }, {
            useCache: false
        });

        expect(result.ok).to.equal(false);
        expect(result.source).to.equal('fallback');
        expect(result.text).to.equal('');
        expect(openAiServer.requests).to.have.length(1);
    });

    it('should reject overlong live OpenAI responses without retrying', async () => {
        openAiServer = await createOpenAiMockServer(() => ({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            created: 1710000000,
            model: 'gpt-4o-mini',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: '很长'.repeat(120)
                    },
                    finish_reason: 'stop'
                }
            ],
            usage: {
                prompt_tokens: 24,
                completion_tokens: 120,
                total_tokens: 144
            }
        }));
        fixture = loadWrapperFixture(tmpDir, {
            LLM_PROVIDER: 'openai',
            OPENAI_API_KEY: 'test-key',
            OPENAI_BASE_URL: openAiServer.url,
            LLM_MODEL: 'gpt-4o-mini'
        });

        const result = await fixture.wrapper.ask('hello', { mood: 'verbose' }, {
            useCache: false
        });

        expect(result.ok).to.equal(false);
        expect(result.source).to.equal('fallback');
        expect(result.text).to.equal('');
        expect(openAiServer.requests).to.have.length(1);
    });
});
