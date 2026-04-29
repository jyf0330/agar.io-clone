/*jshint expr:true */

'use strict';

const expect = require('chai').expect;
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function clearModule(modulePath) {
    try {
        delete require.cache[require.resolve(modulePath)];
    } catch (_error) {
        // Module may not have been loaded yet.
    }
}

function loadRepository(repoName, dbPath) {
    process.env.SERVER_DB_PATH = dbPath;
    clearModule('../../apps/server/src/sql');
    clearModule('../../apps/server/src/repositories/' + repoName);
    return require('../../apps/server/src/repositories/' + repoName);
}

function runPythonSqlite(dbPath, query, options) {
    const payload = JSON.stringify({
        dbPath: dbPath,
        query: query,
        params: options && options.params ? options.params : [],
        read: Boolean(options && options.read)
    });
    const script = [
        'import json, sqlite3, sys',
        'payload = json.loads(sys.stdin.read())',
        'conn = sqlite3.connect(payload["dbPath"])',
        'conn.row_factory = sqlite3.Row',
        'try:',
        '    cursor = conn.execute(payload["query"], payload["params"])',
        '    if payload["read"]:',
        '        print(json.dumps([dict(row) for row in cursor.fetchall()]))',
        '    else:',
        '        conn.commit()',
        'finally:',
        '    conn.close()'
    ].join('\n');
    const result = childProcess.spawnSync(process.env.PYTHON || process.env.PYTHON3 || 'python3', ['-c', script], {
        input: payload,
        encoding: 'utf8'
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error((result.stderr || result.stdout || 'python sqlite failed').trim());
    }

    return options && options.read ? JSON.parse(result.stdout || '[]') : [];
}

function readRows(dbPath, query) {
    return runPythonSqlite(dbPath, query, { read: true });
}

function executeSql(dbPath, query) {
    runPythonSqlite(dbPath, query);
}

describe('logging repositories', function () {
    let tmpDir;
    let previousServerDbPath;
    let originalNow;

    beforeEach(function () {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agar-logging-repo-'));
        previousServerDbPath = process.env.SERVER_DB_PATH;
        originalNow = Date.now;
    });

    afterEach(function () {
        Date.now = originalNow;
        if (previousServerDbPath === undefined) {
            delete process.env.SERVER_DB_PATH;
        } else {
            process.env.SERVER_DB_PATH = previousServerDbPath;
        }
        clearModule('../../apps/server/src/repositories/chat-repository');
        clearModule('../../apps/server/src/repositories/logging-repository');
        clearModule('../../apps/server/src/sql');
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('should persist failed admin login attempts with an audit timestamp', async function () {
        const dbPath = path.join(tmpDir, 'server.sqlite3');
        Date.now = function () {
            return 1700000000123;
        };
        const repository = loadRepository('logging-repository', dbPath);

        await repository.logFailedLoginAttempt('bad-admin', '203.0.113.9');

        const rows = readRows(dbPath, 'SELECT username, ip_address, created_at FROM failed_login_attempts');
        expect(rows).to.deep.equal([{
            username: 'bad-admin',
            ip_address: '203.0.113.9',
            created_at: 1700000000123
        }]);
    });

    it('should migrate old failed login tables before writing new audit rows', async function () {
        const dbPath = path.join(tmpDir, 'server.sqlite3');
        executeSql(dbPath, 'CREATE TABLE failed_login_attempts (username TEXT, ip_address TEXT)');
        Date.now = function () {
            return 1700000000456;
        };
        const repository = loadRepository('logging-repository', dbPath);

        await repository.logFailedLoginAttempt('legacy-admin', '198.51.100.4');

        const rows = readRows(dbPath, 'SELECT username, ip_address, created_at FROM failed_login_attempts');
        expect(rows).to.deep.equal([{
            username: 'legacy-admin',
            ip_address: '198.51.100.4',
            created_at: 1700000000456
        }]);
    });

    it('should persist chat messages with the emitted timestamp', async function () {
        const dbPath = path.join(tmpDir, 'server.sqlite3');
        Date.now = function () {
            return 1700000000789;
        };
        const repository = loadRepository('chat-repository', dbPath);

        await repository.logChatMessage('player-one', 'hello arena', '192.0.2.8');

        const rows = readRows(dbPath, 'SELECT username, message, ip_address, timestamp FROM chat_messages');
        expect(rows).to.deep.equal([{
            username: 'player-one',
            message: 'hello arena',
            ip_address: '192.0.2.8',
            timestamp: 1700000000789
        }]);
    });
});
