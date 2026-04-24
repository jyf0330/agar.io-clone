'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_MEMORY_DB_PATH = path.resolve(process.cwd(), 'data/memory.db');

const schemaSql = `
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  npc_id TEXT,
  session_id TEXT,
  kind TEXT,
  payload TEXT,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, npc_id, ts);
CREATE INDEX IF NOT EXISTS idx_events_player ON events(player_id, ts);

CREATE TABLE IF NOT EXISTS session_summaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  npc_id TEXT,
  session_id TEXT,
  summary TEXT,
  relationship_delta INTEGER,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_player_npc
  ON session_summaries(player_id, npc_id, ts);

CREATE TABLE IF NOT EXISTS persona_impressions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT,
  npc_id TEXT,
  impression TEXT,
  relationship_value INTEGER,
  updated_ts INTEGER,
  UNIQUE(player_id, npc_id)
);
`;

function resolveDbPath() {
    return process.env.MEMORY_DB_PATH || DEFAULT_MEMORY_DB_PATH;
}

function getPythonExecutable() {
    return process.env.PYTHON || process.env.PYTHON3 || 'python3';
}

function normalizeLimit(limit, fallback) {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }
    return Math.min(Math.floor(parsed), 1000);
}

function executeSql(query, params, options) {
    const dbPath = resolveDbPath();
    fs.mkdirSync(path.dirname(dbPath), {recursive: true});

    const payload = JSON.stringify({
        dbPath: dbPath,
        schemaSql: schemaSql,
        query: query,
        params: params || [],
        mode: options && options.mode ? options.mode : 'run'
    });
    const script = [
        'import json, sqlite3, sys',
        'payload = json.loads(sys.stdin.read())',
        'conn = sqlite3.connect(payload["dbPath"])',
        'conn.row_factory = sqlite3.Row',
        'try:',
        '    conn.executescript(payload["schemaSql"])',
        '    cursor = conn.execute(payload["query"], payload["params"])',
        '    if payload["mode"] == "all":',
        '        rows = [dict(row) for row in cursor.fetchall()]',
        '        print(json.dumps({"rows": rows}))',
        '    else:',
        '        conn.commit()',
        '        print(json.dumps({"changes": conn.total_changes, "lastID": cursor.lastrowid}))',
        'finally:',
        '    conn.close()'
    ].join('\n');
    const result = childProcess.spawnSync(getPythonExecutable(), ['-c', script], {
        input: payload,
        encoding: 'utf8'
    });

    if (result.error) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error((result.stderr || result.stdout || 'memory sqlite failed').trim());
    }

    return JSON.parse(result.stdout || '{}');
}

function toCamelEvent(row) {
    return {
        id: row.id,
        playerId: row.player_id,
        npcId: row.npc_id,
        sessionId: row.session_id,
        kind: row.kind,
        payload: row.payload ? JSON.parse(row.payload) : null,
        ts: row.ts
    };
}

function toCamelSummary(row) {
    return {
        id: row.id,
        playerId: row.player_id,
        npcId: row.npc_id,
        sessionId: row.session_id,
        summary: row.summary,
        relationshipDelta: row.relationship_delta,
        ts: row.ts
    };
}

function toCamelImpression(row) {
    if (!row) {
        return null;
    }

    return {
        id: row.id,
        playerId: row.player_id,
        npcId: row.npc_id,
        impression: row.impression,
        relationshipValue: row.relationship_value,
        updatedTs: row.updated_ts
    };
}

function buildWhere(filters, mapping) {
    const clauses = [];
    const params = [];

    Object.keys(mapping).forEach((key) => {
        if (filters && filters[key] !== undefined && filters[key] !== null) {
            clauses.push(mapping[key] + ' = ?');
            params.push(filters[key]);
        }
    });

    return {
        sql: clauses.length ? ' WHERE ' + clauses.join(' AND ') : '',
        params: params
    };
}

function migrate() {
    executeSql('SELECT 1', [], {mode: 'all'});
}

function listTables() {
    const result = executeSql(
        "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
        [],
        {mode: 'all'}
    );
    return result.rows.map((row) => row.name);
}

function recordEvent(event) {
    const safeEvent = event || {};
    const result = executeSql(
        [
            'INSERT INTO events(player_id, npc_id, session_id, kind, payload, ts)',
            'VALUES (?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeEvent.playerId || null,
            safeEvent.npcId || null,
            safeEvent.sessionId || null,
            safeEvent.kind || 'event',
            JSON.stringify(safeEvent.payload || {}),
            typeof safeEvent.ts === 'number' ? safeEvent.ts : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function listEvents(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        npcId: 'npc_id',
        sessionId: 'session_id',
        kind: 'kind'
    });
    const limit = normalizeLimit(filters && filters.limit, 500);
    const result = executeSql(
        'SELECT * FROM events' + where.sql + ' ORDER BY ts ASC, id ASC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelEvent);
}

function addSessionSummary(summary) {
    const safeSummary = summary || {};
    const result = executeSql(
        [
            'INSERT INTO session_summaries(',
            'player_id, npc_id, session_id, summary, relationship_delta, ts',
            ') VALUES (?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeSummary.playerId || null,
            safeSummary.npcId || null,
            safeSummary.sessionId || null,
            safeSummary.summary || '',
            typeof safeSummary.relationshipDelta === 'number' ? safeSummary.relationshipDelta : 0,
            typeof safeSummary.ts === 'number' ? safeSummary.ts : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function listSessionSummaries(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        npcId: 'npc_id',
        sessionId: 'session_id'
    });
    const limit = normalizeLimit(filters && filters.limit, 100);
    const result = executeSql(
        'SELECT * FROM session_summaries' + where.sql + ' ORDER BY ts DESC, id DESC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelSummary);
}

function upsertPersonaImpression(impression) {
    const safeImpression = impression || {};
    const result = executeSql(
        [
            'INSERT INTO persona_impressions(',
            'player_id, npc_id, impression, relationship_value, updated_ts',
            ') VALUES (?, ?, ?, ?, ?)',
            'ON CONFLICT(player_id, npc_id) DO UPDATE SET',
            'impression = excluded.impression,',
            'relationship_value = excluded.relationship_value,',
            'updated_ts = excluded.updated_ts'
        ].join(' '),
        [
            safeImpression.playerId || null,
            safeImpression.npcId || null,
            safeImpression.impression || '',
            typeof safeImpression.relationshipValue === 'number' ? safeImpression.relationshipValue : 0,
            typeof safeImpression.updatedTs === 'number' ? safeImpression.updatedTs : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function getPersonaImpression(playerId, npcId) {
    const result = executeSql(
        'SELECT * FROM persona_impressions WHERE player_id = ? AND npc_id = ? LIMIT 1',
        [playerId, npcId],
        {mode: 'all'}
    );

    return toCamelImpression(result.rows[0] || null);
}

migrate();

module.exports = {
    resolveDbPath: resolveDbPath,
    migrate: migrate,
    listTables: listTables,
    recordEvent: recordEvent,
    listEvents: listEvents,
    addSessionSummary: addSessionSummary,
    listSessionSummaries: listSessionSummaries,
    upsertPersonaImpression: upsertPersonaImpression,
    getPersonaImpression: getPersonaImpression
};
