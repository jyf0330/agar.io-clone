'use strict';

const {expect} = require('chai');
const fs = require('fs');
const os = require('os');
const path = require('path');

function loadStore(dbPath) {
    delete require.cache[require.resolve('../../apps/server/src/memory/store')];
    process.env.MEMORY_DB_PATH = dbPath;
    return require('../../apps/server/src/memory/store');
}

describe('memory store', function () {
    let tmpDir;
    let previousMemoryPath;

    beforeEach(function () {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-store-'));
        previousMemoryPath = process.env.MEMORY_DB_PATH;
    });

    afterEach(function () {
        if (previousMemoryPath === undefined) {
            delete process.env.MEMORY_DB_PATH;
        } else {
            process.env.MEMORY_DB_PATH = previousMemoryPath;
        }
        fs.rmSync(tmpDir, {recursive: true, force: true});
    });

    it('should migrate the three Week 2 memory tables', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));
        const tables = store.listTables();

        expect(tables).to.include('sessions');
        expect(tables).to.include('player_traces');
        expect(tables).to.include('chat_records');
        expect(tables).to.include('item_events');
        expect(tables).to.include('part_events');
        expect(tables).to.include('combat_events');
        expect(tables).to.include('ghost_anchors');
        expect(tables).to.include('events');
        expect(tables).to.include('session_summaries');
        expect(tables).to.include('persona_impressions');
    });

    it('should record and list V5 historical echo session metadata', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.recordSession({
            sessionId: 'session-1',
            playerId: 'player-a',
            playerName: 'Archivist',
            mapId: 'fixed-arena',
            consentToRecord: false,
            startedAt: 1000,
            endedAt: null,
            isSeed: true,
            isReplayAllowed: false
        });
        store.endSession('session-1', 'player-a', 2000);

        const sessions = store.listSessions({sessionId: 'session-1'});

        expect(sessions).to.have.length(1);
        expect(sessions[0]).to.include({
            sessionId: 'session-1',
            playerId: 'player-a',
            playerName: 'Archivist',
            mapId: 'fixed-arena',
            consentToRecord: false,
            startedAt: 1000,
            endedAt: 2000,
            isSeed: true,
            isReplayAllowed: false
        });
    });

    it('should mark seed sessions and clear historical echo data', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.recordSession({
            sessionId: 'session-1',
            playerId: 'player-a',
            startedAt: 1000,
            isSeed: false
        });
        store.recordPlayerTrace({
            sessionId: 'session-1',
            playerId: 'player-a',
            t: 0,
            x: 10,
            y: 20
        });
        store.recordEvent({
            sessionId: 'session-1',
            playerId: 'player-a',
            kind: 'ghost_trace',
            payload: {x: 10, y: 20}
        });

        store.markSeedSession('session-1');
        expect(store.listSessions({sessionId: 'session-1'})[0].isSeed).to.equal(true);

        store.clearHistoricalEchoData();
        expect(store.listSessions({sessionId: 'session-1'})).to.have.length(0);
        expect(store.listPlayerTraces({sessionId: 'session-1'})).to.have.length(0);
        expect(store.listEvents({sessionId: 'session-1', kind: 'ghost_trace'})).to.have.length(0);
    });

    it('should record and query V5 player trace points by session and player', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.recordPlayerTrace({
            sessionId: 'session-1',
            playerId: 'player-a',
            t: 200,
            x: 120,
            y: 130,
            size: 24,
            mass: 10,
            alive: true,
            ts: 1200
        });

        const traces = store.listPlayerTraces({
            sessionId: 'session-1',
            playerId: 'player-a'
        });

        expect(traces).to.deep.include({
            id: traces[0].id,
            sessionId: 'session-1',
            playerId: 'player-a',
            t: 200,
            x: 120,
            y: 130,
            size: 24,
            mass: 10,
            alive: true,
            ts: 1200
        });
    });

    it('should record and query V5 chat records by session and player', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.recordChatRecord({
            sessionId: 'session-1',
            playerId: 'player-a',
            playerName: 'Archivist',
            t: 220,
            x: 140,
            y: 150,
            text: '这里有回声',
            replayAllowed: true,
            ts: 1220
        });

        const chats = store.listChatRecords({
            sessionId: 'session-1',
            playerId: 'player-a'
        });

        expect(chats).to.deep.include({
            id: chats[0].id,
            sessionId: 'session-1',
            playerId: 'player-a',
            playerName: 'Archivist',
            t: 220,
            x: 140,
            y: 150,
            text: '这里有回声',
            replayAllowed: true,
            ts: 1220
        });
    });

    it('should record and query V5 item events with JSON payloads', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.recordItemEvent({
            eventId: 'item-1',
            sessionId: 'session-1',
            playerId: 'player-a',
            eventType: 'part_pickup',
            t: 240,
            x: 160,
            y: 170,
            payload: {part: {type: 'HAND'}},
            ts: 1240
        });

        const itemEvents = store.listItemEvents({
            sessionId: 'session-1',
            eventType: 'part_pickup'
        });

        expect(itemEvents).to.deep.include({
            id: itemEvents[0].id,
            eventId: 'item-1',
            sessionId: 'session-1',
            playerId: 'player-a',
            eventType: 'part_pickup',
            t: 240,
            x: 160,
            y: 170,
            payload: {part: {type: 'HAND'}},
            ts: 1240
        });
    });

    it('should record and query V5 part lifecycle events with JSON payloads', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.recordPartEvent({
            eventId: 'part-1',
            sessionId: 'session-1',
            playerId: 'player-a',
            eventType: 'part_equipped',
            t: 260,
            x: 180,
            y: 190,
            payload: {part: {partId: 'p1', type: 'HAND'}},
            ts: 1260
        });

        const partEvents = store.listPartEvents({
            sessionId: 'session-1',
            eventType: 'part_equipped'
        });

        expect(partEvents).to.deep.include({
            id: partEvents[0].id,
            eventId: 'part-1',
            sessionId: 'session-1',
            playerId: 'player-a',
            eventType: 'part_equipped',
            t: 260,
            x: 180,
            y: 190,
            payload: {part: {partId: 'p1', type: 'HAND'}},
            ts: 1260
        });
    });

    it('should record and query V5 combat events with JSON payloads', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.recordCombatEvent({
            eventId: 'combat-1',
            sessionId: 'session-1',
            playerId: 'player-a',
            eventType: 'kill',
            t: 280,
            x: 200,
            y: 210,
            payload: {targetPlayerId: 'player-b'},
            ts: 1280
        });

        const combatEvents = store.listCombatEvents({
            sessionId: 'session-1',
            eventType: 'kill'
        });

        expect(combatEvents).to.deep.include({
            id: combatEvents[0].id,
            eventId: 'combat-1',
            sessionId: 'session-1',
            playerId: 'player-a',
            eventType: 'kill',
            t: 280,
            x: 200,
            y: 210,
            payload: {targetPlayerId: 'player-b'},
            ts: 1280
        });
    });

    it('should record and query V5 ghost anchors by map and event type', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.recordGhostAnchor({
            anchorId: 'anchor-1',
            sourceSessionId: 'session-1',
            sourcePlayerId: 'player-a',
            mapId: 'fixed-arena',
            t: 300,
            x: 220,
            y: 230,
            eventType: 'part_pickup',
            priority: 50,
            ts: 1300
        });

        const anchors = store.listGhostAnchors({
            mapId: 'fixed-arena',
            eventType: 'part_pickup'
        });

        expect(anchors).to.deep.include({
            id: anchors[0].id,
            anchorId: 'anchor-1',
            sourceSessionId: 'session-1',
            sourcePlayerId: 'player-a',
            mapId: 'fixed-arena',
            t: 300,
            x: 220,
            y: 230,
            eventType: 'part_pickup',
            priority: 50,
            ts: 1300
        });
    });

    it('should record and query raw npc events with JSON payloads', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));
        const event = store.recordEvent({
            eventId: 'l1-session-1-player-a-mochi-1',
            playerId: 'player-a',
            npcId: 'mochi',
            sessionId: 'session-1',
            mapId: 'fixed-arena',
            x: 120,
            y: 140,
            kind: 'npc_speak',
            eventType: 'chat_turn',
            payload: {text: '蓝色很好'},
            ts: 123,
            createdAt: 124
        });

        const events = store.listEvents({sessionId: 'session-1', mapId: 'fixed-arena'});

        expect(event.id).to.be.a('number');
        expect(event.eventId).to.equal('l1-session-1-player-a-mochi-1');
        expect(events).to.have.length(1);
        expect(events[0]).to.include({
            eventId: 'l1-session-1-player-a-mochi-1',
            playerId: 'player-a',
            npcId: 'mochi',
            sessionId: 'session-1',
            mapId: 'fixed-arena',
            x: 120,
            y: 140,
            kind: 'npc_speak',
            eventType: 'chat_turn',
            ts: 123,
            createdAt: 124
        });
        expect(events[0].payload).to.deep.equal({text: '蓝色很好'});
    });

    it('should store session summaries and persona impressions', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));

        store.addSessionSummary({
            playerId: 'player-a',
            npcId: 'doudou',
            sessionId: 'session-1',
            summary: '玩家问了颜色，豆豆很开心。',
            expectation: '明天带一个很亮的颜色来。',
            referencedL1EventIds: ['l1-a', 'l1-b'],
            relationshipDelta: 2,
            ts: 456
        });
        store.upsertPersonaImpression({
            playerId: 'player-a',
            npcId: 'doudou',
            impression: '喜欢聊天，偏爱亮色。',
            evidenceEventIds: ['l1-a', 'l1-b'],
            relationshipValue: 5,
            updatedTs: 789
        });

        const summaries = store.listSessionSummaries({playerId: 'player-a'});
        expect(summaries).to.have.length(1);
        expect(summaries[0].expectation).to.contain('亮');
        expect(summaries[0].referencedL1EventIds).to.deep.equal(['l1-a', 'l1-b']);
        expect(store.getPersonaImpression('player-a', 'doudou')).to.include({
            playerId: 'player-a',
            npcId: 'doudou',
            impression: '喜欢聊天，偏爱亮色。',
            relationshipValue: 5,
            updatedTs: 789
        });
        expect(store.getPersonaImpression('player-a', 'doudou').evidenceEventIds).to.deep.equal(['l1-a', 'l1-b']);
    });
});
