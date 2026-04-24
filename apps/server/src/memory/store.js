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

CREATE TABLE IF NOT EXISTS player_traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  player_id TEXT,
  t INTEGER,
  x REAL,
  y REAL,
  size REAL,
  mass REAL,
  alive INTEGER,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_player_traces_session_player_t
  ON player_traces(session_id, player_id, t);
CREATE INDEX IF NOT EXISTS idx_player_traces_position
  ON player_traces(session_id, x, y);

CREATE TABLE IF NOT EXISTS chat_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  player_id TEXT,
  player_name TEXT,
  t INTEGER,
  x REAL,
  y REAL,
  text TEXT,
  replay_allowed INTEGER,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_chat_records_session_player_t
  ON chat_records(session_id, player_id, t);
CREATE INDEX IF NOT EXISTS idx_chat_records_position
  ON chat_records(session_id, x, y);

CREATE TABLE IF NOT EXISTS item_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  session_id TEXT,
  player_id TEXT,
  event_type TEXT,
  t INTEGER,
  x REAL,
  y REAL,
  payload TEXT,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_item_events_session_type_t
  ON item_events(session_id, event_type, t);
CREATE INDEX IF NOT EXISTS idx_item_events_position
  ON item_events(session_id, x, y);

CREATE TABLE IF NOT EXISTS part_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  session_id TEXT,
  player_id TEXT,
  event_type TEXT,
  t INTEGER,
  x REAL,
  y REAL,
  payload TEXT,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_part_events_session_type_t
  ON part_events(session_id, event_type, t);
CREATE INDEX IF NOT EXISTS idx_part_events_position
  ON part_events(session_id, x, y);

CREATE TABLE IF NOT EXISTS combat_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  session_id TEXT,
  player_id TEXT,
  event_type TEXT,
  t INTEGER,
  x REAL,
  y REAL,
  payload TEXT,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_combat_events_session_type_t
  ON combat_events(session_id, event_type, t);
CREATE INDEX IF NOT EXISTS idx_combat_events_position
  ON combat_events(session_id, x, y);

CREATE TABLE IF NOT EXISTS ghost_anchors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anchor_id TEXT,
  source_session_id TEXT,
  source_player_id TEXT,
  map_id TEXT,
  t INTEGER,
  x REAL,
  y REAL,
  event_type TEXT,
  priority INTEGER,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ghost_anchors_map_type_t
  ON ghost_anchors(map_id, event_type, t);
CREATE INDEX IF NOT EXISTS idx_ghost_anchors_position
  ON ghost_anchors(map_id, x, y);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  player_id TEXT,
  npc_id TEXT,
  session_id TEXT,
  map_id TEXT,
  x REAL,
  y REAL,
  kind TEXT,
  event_type TEXT,
  payload TEXT,
  ts INTEGER,
  created_at INTEGER
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
  referenced_l1_event_ids TEXT,
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
  evidence_event_ids TEXT,
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
        '    try:',
        '        conn.execute("ALTER TABLE session_summaries ADD COLUMN referenced_l1_event_ids TEXT DEFAULT \'[]\'")',
        '        conn.commit()',
        '    except sqlite3.OperationalError as error:',
        '        if "duplicate column name" not in str(error):',
        '            raise',
        '    try:',
        '        conn.execute("ALTER TABLE persona_impressions ADD COLUMN evidence_event_ids TEXT DEFAULT \'[]\'")',
        '        conn.commit()',
        '    except sqlite3.OperationalError as error:',
        '        if "duplicate column name" not in str(error):',
        '            raise',
        '    for column_sql in [',
        '        "ALTER TABLE events ADD COLUMN event_id TEXT",',
        '        "ALTER TABLE events ADD COLUMN map_id TEXT",',
        '        "ALTER TABLE events ADD COLUMN x REAL",',
        '        "ALTER TABLE events ADD COLUMN y REAL",',
        '        "ALTER TABLE events ADD COLUMN event_type TEXT",',
        '        "ALTER TABLE events ADD COLUMN created_at INTEGER"',
        '    ]:',
        '        try:',
        '            conn.execute(column_sql)',
        '            conn.commit()',
        '        except sqlite3.OperationalError as error:',
        '            if "duplicate column name" not in str(error):',
        '                raise',
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
        eventId: row.event_id || String(row.id),
        playerId: row.player_id,
        npcId: row.npc_id,
        sessionId: row.session_id,
        mapId: row.map_id || '',
        x: row.x,
        y: row.y,
        kind: row.kind,
        eventType: row.event_type || row.kind,
        payload: row.payload ? JSON.parse(row.payload) : null,
        ts: row.ts,
        createdAt: row.created_at || row.ts
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
        referencedL1EventIds: row.referenced_l1_event_ids ? JSON.parse(row.referenced_l1_event_ids) : [],
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
        evidenceEventIds: row.evidence_event_ids ? JSON.parse(row.evidence_event_ids) : [],
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

function toCamelTrace(row) {
    return {
        id: row.id,
        sessionId: row.session_id,
        playerId: row.player_id,
        t: row.t,
        x: row.x,
        y: row.y,
        size: row.size,
        mass: row.mass,
        alive: row.alive === 1,
        ts: row.ts
    };
}

function toCamelChatRecord(row) {
    return {
        id: row.id,
        sessionId: row.session_id,
        playerId: row.player_id,
        playerName: row.player_name || '',
        t: row.t,
        x: row.x,
        y: row.y,
        text: row.text || '',
        replayAllowed: row.replay_allowed === 1,
        ts: row.ts
    };
}

function toCamelItemEvent(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        sessionId: row.session_id,
        playerId: row.player_id,
        eventType: row.event_type,
        t: row.t,
        x: row.x,
        y: row.y,
        payload: row.payload ? JSON.parse(row.payload) : {},
        ts: row.ts
    };
}

function toCamelPartEvent(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        sessionId: row.session_id,
        playerId: row.player_id,
        eventType: row.event_type,
        t: row.t,
        x: row.x,
        y: row.y,
        payload: row.payload ? JSON.parse(row.payload) : {},
        ts: row.ts
    };
}

function toCamelCombatEvent(row) {
    return {
        id: row.id,
        eventId: row.event_id,
        sessionId: row.session_id,
        playerId: row.player_id,
        eventType: row.event_type,
        t: row.t,
        x: row.x,
        y: row.y,
        payload: row.payload ? JSON.parse(row.payload) : {},
        ts: row.ts
    };
}

function toCamelGhostAnchor(row) {
    return {
        id: row.id,
        anchorId: row.anchor_id,
        sourceSessionId: row.source_session_id,
        sourcePlayerId: row.source_player_id,
        mapId: row.map_id,
        t: row.t,
        x: row.x,
        y: row.y,
        eventType: row.event_type,
        priority: row.priority,
        ts: row.ts
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

function clearHistoricalEchoData() {
    [
        'ghost_anchors',
        'combat_events',
        'part_events',
        'item_events',
        'chat_records',
        'player_traces',
        'sessions'
    ].forEach((tableName) => {
        executeSql('DELETE FROM ' + tableName, []);
    });
    executeSql(
        [
            'DELETE FROM events WHERE kind IN (',
            "'ghost_trace', 'ghost_chat', 'ghost_item',",
            "'part_pickup', 'part_drop', 'part_equipped', 'part_replaced', 'part_stolen',",
            "'kill', 'swallowed'",
            ')'
        ].join(' '),
        []
    );
}

function recordEvent(event) {
    const safeEvent = event || {};
    const ts = typeof safeEvent.ts === 'number' ? safeEvent.ts : Date.now();
    const kind = safeEvent.kind || safeEvent.eventType || 'event';
    const result = executeSql(
        [
            'INSERT INTO events(',
            'event_id, player_id, npc_id, session_id, map_id, x, y, kind, event_type, payload, ts, created_at',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeEvent.eventId || null,
            safeEvent.playerId || null,
            safeEvent.npcId || null,
            safeEvent.sessionId || null,
            safeEvent.mapId || null,
            typeof safeEvent.x === 'number' ? safeEvent.x : null,
            typeof safeEvent.y === 'number' ? safeEvent.y : null,
            kind,
            safeEvent.eventType || kind,
            JSON.stringify(safeEvent.payload || {}),
            ts,
            typeof safeEvent.createdAt === 'number' ? safeEvent.createdAt : ts
        ]
    );

    return {
        id: result.lastID,
        eventId: safeEvent.eventId || String(result.lastID)
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

function markSeedSession(sessionId, playerId, isSeed) {
    const seedValue = isSeed === false ? 0 : 1;
    if (playerId) {
        executeSql(
            'UPDATE sessions SET is_seed = ?, is_replay_allowed = 1 WHERE session_id = ? AND player_id = ?',
            [seedValue, sessionId, playerId]
        );
        return;
    }

    executeSql(
        'UPDATE sessions SET is_seed = ?, is_replay_allowed = 1 WHERE session_id = ?',
        [seedValue, sessionId]
    );
}

function recordPlayerTrace(trace) {
    const safeTrace = trace || {};
    const result = executeSql(
        [
            'INSERT INTO player_traces(',
            'session_id, player_id, t, x, y, size, mass, alive, ts',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeTrace.sessionId || null,
            safeTrace.playerId || null,
            typeof safeTrace.t === 'number' ? safeTrace.t : 0,
            typeof safeTrace.x === 'number' ? safeTrace.x : null,
            typeof safeTrace.y === 'number' ? safeTrace.y : null,
            typeof safeTrace.size === 'number' ? safeTrace.size : null,
            typeof safeTrace.mass === 'number' ? safeTrace.mass : null,
            safeTrace.alive === false ? 0 : 1,
            typeof safeTrace.ts === 'number' ? safeTrace.ts : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function listPlayerTraces(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        sessionId: 'session_id'
    });
    const limit = normalizeLimit(filters && filters.limit, 1000);
    const result = executeSql(
        'SELECT * FROM player_traces' + where.sql + ' ORDER BY t ASC, id ASC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelTrace);
}

function recordChatRecord(chat) {
    const safeChat = chat || {};
    const result = executeSql(
        [
            'INSERT INTO chat_records(',
            'session_id, player_id, player_name, t, x, y, text, replay_allowed, ts',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeChat.sessionId || null,
            safeChat.playerId || null,
            safeChat.playerName || '',
            typeof safeChat.t === 'number' ? safeChat.t : 0,
            typeof safeChat.x === 'number' ? safeChat.x : null,
            typeof safeChat.y === 'number' ? safeChat.y : null,
            safeChat.text || '',
            safeChat.replayAllowed === false ? 0 : 1,
            typeof safeChat.ts === 'number' ? safeChat.ts : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function listChatRecords(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        sessionId: 'session_id'
    });
    const limit = normalizeLimit(filters && filters.limit, 500);
    const result = executeSql(
        'SELECT * FROM chat_records' + where.sql + ' ORDER BY t ASC, id ASC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelChatRecord);
}

function recordItemEvent(event) {
    const safeEvent = event || {};
    const result = executeSql(
        [
            'INSERT INTO item_events(',
            'event_id, session_id, player_id, event_type, t, x, y, payload, ts',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeEvent.eventId || null,
            safeEvent.sessionId || null,
            safeEvent.playerId || null,
            safeEvent.eventType || 'item_event',
            typeof safeEvent.t === 'number' ? safeEvent.t : 0,
            typeof safeEvent.x === 'number' ? safeEvent.x : null,
            typeof safeEvent.y === 'number' ? safeEvent.y : null,
            JSON.stringify(safeEvent.payload || {}),
            typeof safeEvent.ts === 'number' ? safeEvent.ts : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function listItemEvents(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        sessionId: 'session_id',
        eventType: 'event_type'
    });
    const limit = normalizeLimit(filters && filters.limit, 500);
    const result = executeSql(
        'SELECT * FROM item_events' + where.sql + ' ORDER BY t ASC, id ASC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelItemEvent);
}

function recordPartEvent(event) {
    const safeEvent = event || {};
    const result = executeSql(
        [
            'INSERT INTO part_events(',
            'event_id, session_id, player_id, event_type, t, x, y, payload, ts',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeEvent.eventId || null,
            safeEvent.sessionId || null,
            safeEvent.playerId || null,
            safeEvent.eventType || 'part_event',
            typeof safeEvent.t === 'number' ? safeEvent.t : 0,
            typeof safeEvent.x === 'number' ? safeEvent.x : null,
            typeof safeEvent.y === 'number' ? safeEvent.y : null,
            JSON.stringify(safeEvent.payload || {}),
            typeof safeEvent.ts === 'number' ? safeEvent.ts : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function listPartEvents(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        sessionId: 'session_id',
        eventType: 'event_type'
    });
    const limit = normalizeLimit(filters && filters.limit, 500);
    const result = executeSql(
        'SELECT * FROM part_events' + where.sql + ' ORDER BY t ASC, id ASC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelPartEvent);
}

function recordCombatEvent(event) {
    const safeEvent = event || {};
    const result = executeSql(
        [
            'INSERT INTO combat_events(',
            'event_id, session_id, player_id, event_type, t, x, y, payload, ts',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeEvent.eventId || null,
            safeEvent.sessionId || null,
            safeEvent.playerId || null,
            safeEvent.eventType || 'combat_event',
            typeof safeEvent.t === 'number' ? safeEvent.t : 0,
            typeof safeEvent.x === 'number' ? safeEvent.x : null,
            typeof safeEvent.y === 'number' ? safeEvent.y : null,
            JSON.stringify(safeEvent.payload || {}),
            typeof safeEvent.ts === 'number' ? safeEvent.ts : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function listCombatEvents(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        sessionId: 'session_id',
        eventType: 'event_type'
    });
    const limit = normalizeLimit(filters && filters.limit, 500);
    const result = executeSql(
        'SELECT * FROM combat_events' + where.sql + ' ORDER BY t ASC, id ASC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelCombatEvent);
}

function recordGhostAnchor(anchor) {
    const safeAnchor = anchor || {};
    const result = executeSql(
        [
            'INSERT INTO ghost_anchors(',
            'anchor_id, source_session_id, source_player_id, map_id, t, x, y, event_type, priority, ts',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeAnchor.anchorId || null,
            safeAnchor.sourceSessionId || null,
            safeAnchor.sourcePlayerId || null,
            safeAnchor.mapId || 'default-map',
            typeof safeAnchor.t === 'number' ? safeAnchor.t : 0,
            typeof safeAnchor.x === 'number' ? safeAnchor.x : null,
            typeof safeAnchor.y === 'number' ? safeAnchor.y : null,
            safeAnchor.eventType || 'anchor',
            typeof safeAnchor.priority === 'number' ? safeAnchor.priority : 0,
            typeof safeAnchor.ts === 'number' ? safeAnchor.ts : Date.now()
        ]
    );

    return {
        id: result.lastID
    };
}

function listGhostAnchors(filters) {
    const where = buildWhere(filters || {}, {
        sourceSessionId: 'source_session_id',
        sourcePlayerId: 'source_player_id',
        mapId: 'map_id',
        eventType: 'event_type'
    });
    const limit = normalizeLimit(filters && filters.limit, 500);
    const result = executeSql(
        'SELECT * FROM ghost_anchors' + where.sql + ' ORDER BY priority DESC, t ASC, id ASC LIMIT ?',
        where.params.concat(limit),
        {mode: 'all'}
    );

    return result.rows.map(toCamelGhostAnchor);
}

function listEvents(filters) {
    const where = buildWhere(filters || {}, {
        playerId: 'player_id',
        npcId: 'npc_id',
        sessionId: 'session_id',
        mapId: 'map_id',
        eventType: 'event_type',
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
            'player_id, npc_id, session_id, summary, expectation, referenced_l1_event_ids, relationship_delta, ts',
            ') VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ].join(' '),
        [
            safeSummary.playerId || null,
            safeSummary.npcId || null,
            safeSummary.sessionId || null,
            safeSummary.summary || '',
            safeSummary.expectation || '',
            JSON.stringify(Array.isArray(safeSummary.referencedL1EventIds) ? safeSummary.referencedL1EventIds : []),
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
            'player_id, npc_id, impression, evidence_event_ids, relationship_value, updated_ts',
            ') VALUES (?, ?, ?, ?, ?, ?)',
            'ON CONFLICT(player_id, npc_id) DO UPDATE SET',
            'impression = excluded.impression,',
            'evidence_event_ids = excluded.evidence_event_ids,',
            'relationship_value = excluded.relationship_value,',
            'updated_ts = excluded.updated_ts'
        ].join(' '),
        [
            safeImpression.playerId || null,
            safeImpression.npcId || null,
            safeImpression.impression || '',
            JSON.stringify(Array.isArray(safeImpression.evidenceEventIds) ? safeImpression.evidenceEventIds : []),
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
    clearHistoricalEchoData: clearHistoricalEchoData,
    recordSession: recordSession,
    endSession: endSession,
    listSessions: listSessions,
    markSeedSession: markSeedSession,
    recordPlayerTrace: recordPlayerTrace,
    listPlayerTraces: listPlayerTraces,
    recordChatRecord: recordChatRecord,
    listChatRecords: listChatRecords,
    recordItemEvent: recordItemEvent,
    listItemEvents: listItemEvents,
    recordPartEvent: recordPartEvent,
    listPartEvents: listPartEvents,
    recordCombatEvent: recordCombatEvent,
    listCombatEvents: listCombatEvents,
    recordGhostAnchor: recordGhostAnchor,
    listGhostAnchors: listGhostAnchors,
    recordEvent: recordEvent,
    listEvents: listEvents,
    addSessionSummary: addSessionSummary,
    listSessionSummaries: listSessionSummaries,
    upsertPersonaImpression: upsertPersonaImpression,
    getPersonaImpression: getPersonaImpression
};
