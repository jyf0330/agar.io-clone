/*jshint expr:true */

const expect = require('chai').expect;
const fs = require('fs');
const os = require('os');
const path = require('path');

function clearModule(modulePath) {
    delete require.cache[require.resolve(modulePath)];
}

function loadWrapperFixture(tmpDir) {
    process.env.LLM_PROVIDER = 'mock';
    process.env.LLM_TIMEOUT_MS = '5000';
    process.env.LLM_CACHE_DB_PATH = path.join(tmpDir, 'llm-cache.sqlite3');
    process.env.LLM_CACHE_FALLBACK_PATH = path.join(tmpDir, 'llm-cache.json');
    process.env.LLM_AUDIT_DIR = path.join(tmpDir, 'audit');

    clearModule('../../apps/server/src/llm/cache');
    clearModule('../../apps/server/src/llm/audit');
    clearModule('../../apps/server/src/llm/wrapper');

    return {
        cache: require('../../apps/server/src/llm/cache'),
        audit: require('../../apps/server/src/llm/audit'),
        wrapper: require('../../apps/server/src/llm/wrapper')
    };
}

describe('llm wrapper', () => {
    let tmpDir;
    let fixture;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agar-llm-wrapper-'));
        fixture = loadWrapperFixture(tmpDir);
    });

    afterEach(() => {
        fixture.cache.reset();
        delete process.env.LLM_PROVIDER;
        delete process.env.LLM_TIMEOUT_MS;
        delete process.env.LLM_CACHE_DB_PATH;
        delete process.env.LLM_CACHE_FALLBACK_PATH;
        delete process.env.LLM_AUDIT_DIR;
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

    it('should fall back when provider execution exceeds the timeout', async () => {
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
});
