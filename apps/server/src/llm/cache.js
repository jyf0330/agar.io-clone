'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let Database = null;
let database = null;
const memoryCache = new Map();

function resolveCachePath() {
    return process.env.LLM_CACHE_DB_PATH || path.resolve(process.cwd(), 'data/llm-cache.sqlite3');
}

function resolveFallbackCachePath() {
    return process.env.LLM_CACHE_FALLBACK_PATH || path.resolve(process.cwd(), 'data/llm-cache.json');
}

function loadDatabaseLibrary() {
    if (Database) {
        return Database;
    }

    try {
        Database = require('better-sqlite3');
    } catch (error) {
        Database = false;
    }

    return Database;
}

function ensureDatabase() {
    if (database) {
        return database;
    }

    const DatabaseLibrary = loadDatabaseLibrary();
    if (!DatabaseLibrary) {
        return null;
    }

    const cachePath = resolveCachePath();
    try {
        fs.mkdirSync(path.dirname(cachePath), { recursive: true });
        database = new DatabaseLibrary(cachePath);
        database.exec('CREATE TABLE IF NOT EXISTS llm_cache(key TEXT PRIMARY KEY, text TEXT, ts INTEGER)');
    } catch (error) {
        database = null;
        Database = false;
        return null;
    }

    return database;
}

function createCacheKey(promptId, params) {
    return crypto.createHash('sha256')
        .update(String(promptId) + JSON.stringify(params || {}))
        .digest('hex');
}

function get(key) {
    const db = ensureDatabase();

    if (!db) {
        const fileCache = loadFileCache();
        if (Object.prototype.hasOwnProperty.call(fileCache, key)) {
            memoryCache.set(key, fileCache[key].text);
            return {
                key: key,
                text: fileCache[key].text,
                ts: fileCache[key].ts
            };
        }

        if (!memoryCache.has(key)) {
            return null;
        }

        return {
            key: key,
            text: memoryCache.get(key),
            ts: 0
        };
    }

    return db.prepare('SELECT key, text, ts FROM llm_cache WHERE key = ?').get(key) || null;
}

function set(key, text) {
    const ts = Date.now();
    const db = ensureDatabase();

    if (!db) {
        memoryCache.set(key, text);
        persistFileCacheEntry(key, text, ts);
        return { key: key, text: text, ts: ts };
    }

    db.prepare(
        'INSERT INTO llm_cache(key, text, ts) VALUES(?, ?, ?) ON CONFLICT(key) DO UPDATE SET text = excluded.text, ts = excluded.ts'
    ).run(key, text, ts);

    return { key: key, text: text, ts: ts };
}

function reset() {
    if (database && typeof database.close === 'function') {
        database.close();
    }

    database = null;
    memoryCache.clear();
}

function loadFileCache() {
    const filePath = resolveFallbackCachePath();

    if (!fs.existsSync(filePath)) {
        return {};
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        return {};
    }
}

function persistFileCacheEntry(key, text, ts) {
    const filePath = resolveFallbackCachePath();
    const nextCache = loadFileCache();
    nextCache[key] = {
        text: text,
        ts: ts
    };

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(nextCache), 'utf8');
}

module.exports = {
    createCacheKey: createCacheKey,
    get: get,
    set: set,
    reset: reset,
    resolveCachePath: resolveCachePath,
    resolveFallbackCachePath: resolveFallbackCachePath
};
