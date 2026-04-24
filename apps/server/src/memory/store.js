'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULT_MEMORY_DB_PATH = path.resolve(process.cwd(), 'data/memory.db');

const schemaSql = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  player_id TEXT,
  player_name TEXT,
  map_id TEXT,
  consent_to_record INTEGER,
  started_at INTEGER,
  ended_at INTEGER,
  is_seed INTEGER,
  is_replay_allowed INTEGER,
  UNIQUE(session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_map_started
  ON sessions(map_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_player_started
  ON sessions(player_id, started_at);

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
  expectation TEXT,
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
        '    try:',
        '        conn.execute("ALTER TABLE session_summaries ADD COLUMN expectation TEXT DEFAULT \'\'")',
        '        conn.commit()',
        '    except sqlite3.OperationalError as error:',
        '        if "duplicate column name" not in str(error):',
        '            raise',
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
        expectation: row.expectation || '',
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

function toCamelSession(row) {
    return {
        id: row.id,
        sessionId: row.session_id,
        playerId: row.player_id,
        playerName: row.player_name || '',
        mapId: row.map_id || '',
        consentToRecord: row.consent_to_record === 1,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        isSeed: row.is_seed === 1,
        isReplayAllowed: row.is_replay_allowed === 1
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

function recordSession(session) {
    const safeSession = session || {};
    const result = executeSql(
        [
            'INSERT INTO sessions(',
            'session_id, player_id, player_name, map_id, consent_to_record,',
            'started_at, ended_at, is_seed, is_replay_allowed',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            'ON CONFLICT(session_id, player_id) DO UPDATE SET',
            'player_name = excluded.player_name,',
            'map_id = excluded.map_id,',
            'consent_to_record = excluded.consent_to_record,',
            'started_at = excluded.started_at,',
            'ended_at = COALESCE(excluded.ended_at, sessions.ended_at),',
            'is_seed = excluded.is_seed,',
            'is_replay_allowed = excluded.is_replay_allowed'
        ].join(' '),
        [
            safeSession.sessionId || null,
            safeSession.playerId || null,
            safeSession.playerName || '',
            safeSession.mapId || 'default-map',
            safeSession.consentToRecord === false ? 0 : 1,
            typeof safeSession.startedAt === 'number' ? safeSession.startedAt : Date.now(),
            typeof safeSession.endedAt === 'number' ? safeSession.endedAt : null,
            safeSession.isSeed === true ? 1 : 0,
            safeSession.isReplayAllowed === false ? 0 : 1
        ]
    );

    return {
        id: result.lastID
    };
}

function endSession(sessionId, playerId, endedAt) {
    executeSql(
        'UPDATE sessions SET ended_at = ? WHERE session_id = ? AND player_id = ?',
        [
            typeof endedAt === 'number' ? endedAt : Date.now(),
            sessionId,
            playerId
        ]
    );
}

function listSessions(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        sessionId: 'session_id',
        mapId: 'map_id'
    });
    const limit = normalizeLimit(filters && filters.limit, 100);
    const result = executeSql(
        'SELECT * FROM sessions' + where.sql + ' ORDER BY started_at DESC, id DESC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelSession);
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
            'player_id, npc_id, session_id, summary, expectation, relationship_delta, ts',
            ') VALUES (?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeSummary.playerId || null,
            safeSummary.npcId || null,
            safeSummary.sessionId || null,
            safeSummary.summary || '',
            safeSummary.expectation || '',
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
    recordSession: recordSession,
    endSession: endSession,
    listSessions: listSessions,
    recordEvent: recordEvent,
    listEvents: listEvents,
    addSessionSummary: addSessionSummary,
    listSessionSummaries: listSessionSummaries,
    upsertPersonaImpression: upsertPersonaImpression,
    getPersonaImpression: getPersonaImpression
};
