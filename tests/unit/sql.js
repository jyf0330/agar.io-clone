'use strict';

const {expect} = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

function loadSqlWithEnv(env) {
    delete require.cache[require.resolve('../../apps/server/src/sql')];
    Object.assign(process.env, env || {});
    return require('../../apps/server/src/sql');
}

describe('sql.js', function () {
    let tmpDir;
    let previousServerDbPath;

    beforeEach(function () {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'server-sql-'));
        previousServerDbPath = process.env.SERVER_DB_PATH;
    });

    afterEach(function () {
        if (previousServerDbPath === undefined) {
            delete process.env.SERVER_DB_PATH;
        } else {
            process.env.SERVER_DB_PATH = previousServerDbPath;
        }
        delete require.cache[require.resolve('../../apps/server/src/sql')];
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it('should allow production deployments to place the server sqlite db outside the repo data folder', function () {
        const dbPath = path.join(tmpDir, 'state', 'server.sqlite3');
        const sql = loadSqlWithEnv({SERVER_DB_PATH: dbPath});

        expect(sql.getStatus().path).to.equal(dbPath);
    });
});
