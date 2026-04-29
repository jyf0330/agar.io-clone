'use strict';

const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const config = require(path.resolve(process.cwd(), 'config'));
const sqlInfo = config.sqlinfo;
const dbPath = process.env.SERVER_DB_PATH ? path.resolve(process.env.SERVER_DB_PATH) : path.resolve(process.cwd(), 'data/server-db', sqlInfo.fileName);
let database = null;
let nativeLoadAttempted = false;
let nativeLoadError = null;
const schemaSql = `
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  username TEXT,
  ip_address TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS chat_messages (
  username TEXT,
  message TEXT,
  ip_address TEXT,
  timestamp INTEGER
);
`;
function ensureDatabaseFolder() {
  fs.mkdirSync(path.dirname(dbPath), {
    recursive: true
  });
}
function normalizeParams(params, callback) {
  if (typeof params === 'function') {
    return {
      params: [],
      callback: params
    };
  }
  return {
    params: Array.isArray(params) ? params : [],
    callback: callback
  };
}
function tryLoadNativeDatabase() {
  if (nativeLoadAttempted) {
    return database;
  }
  nativeLoadAttempted = true;
  try {
    const Database = require('better-sqlite3');
    ensureDatabaseFolder();
    database = new Database(dbPath);
    database.exec(schemaSql);
    migrateDatabaseSchemaNative(database);
    return database;
  } catch (error) {
    nativeLoadError = error;
    database = null;
  }
  return null;
}
function migrateDatabaseSchemaNative(db) {
  const failedLoginColumns = db.prepare('PRAGMA table_info(failed_login_attempts)').all().map(column => column.name);
  if (!failedLoginColumns.includes('created_at')) {
    db.exec('ALTER TABLE failed_login_attempts ADD COLUMN created_at INTEGER');
  }
}
function getPythonExecutable() {
  return process.env.PYTHON || process.env.PYTHON3 || 'python3';
}
function runWithPythonSqlite(query, params) {
  ensureDatabaseFolder();
  const payload = JSON.stringify({
    dbPath: dbPath,
    schemaSql: schemaSql,
    query: query,
    params: params || []
  });
  const script = ['import json, sqlite3, sys', 'payload = json.loads(sys.stdin.read())', 'conn = sqlite3.connect(payload["dbPath"])', 'try:', '    conn.executescript(payload["schemaSql"])', '    columns = [row[1] for row in conn.execute("PRAGMA table_info(failed_login_attempts)").fetchall()]', '    if "created_at" not in columns:', '        conn.execute("ALTER TABLE failed_login_attempts ADD COLUMN created_at INTEGER")', '    cursor = conn.execute(payload["query"], payload["params"])', '    conn.commit()', '    print(json.dumps({"changes": conn.total_changes, "lastID": cursor.lastrowid}))', 'finally:', '    conn.close()'].join('\n');
  const result = childProcess.spawnSync(getPythonExecutable(), ['-c', script], {
    input: payload,
    encoding: 'utf8'
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || 'python sqlite failed').trim());
  }
  return JSON.parse(result.stdout || '{}');
}
function run(query, params, callback) {
  const normalized = normalizeParams(params, callback);
  try {
    const db = tryLoadNativeDatabase();
    const result = db ? db.prepare(query).run(normalized.params) : runWithPythonSqlite(query, normalized.params);
    if (typeof normalized.callback === 'function') {
      normalized.callback(null, result);
    }
    return result;
  } catch (error) {
    if (typeof normalized.callback === 'function') {
      normalized.callback(error);
      return null;
    }
    throw error;
  }
}
function close(callback) {
  try {
    if (database) {
      database.close();
      database = null;
      nativeLoadAttempted = false;
    }
    if (typeof callback === 'function') {
      callback(null);
    }
  } catch (error) {
    if (typeof callback === 'function') {
      callback(error);
      return;
    }
    throw error;
  }
}
function getStatus() {
  return {
    path: dbPath,
    native: Boolean(database),
    nativeLoadAttempted: nativeLoadAttempted,
    nativeLoadError: nativeLoadError ? nativeLoadError.message : null,
    fallback: database ? null : 'python-sqlite3'
  };
}
process.on('beforeExit', () => {
  close(error => {
    if (error) {
      console.error('Error closing the database connection. ', error);
    }
  });
});
module.exports = {
  run: run,
  close: close,
  getStatus: getStatus,
  ensureDatabase: tryLoadNativeDatabase
};