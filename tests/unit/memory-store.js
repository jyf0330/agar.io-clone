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

    it('should record and query raw npc events with JSON payloads', function () {
        const store = loadStore(path.join(tmpDir, 'memory.db'));
        const event = store.recordEvent({
            playerId: 'player-a',
            npcId: 'mochi',
            sessionId: 'session-1',
            kind: 'npc_speak',
            payload: {text: '蓝色很好'},
            ts: 123
        });

        const events = store.listEvents({sessionId: 'session-1'});

        expect(event.id).to.be.a('number');
        expect(events).to.have.length(1);
        expect(events[0]).to.include({
            playerId: 'player-a',
            npcId: 'mochi',
            sessionId: 'session-1',
            kind: 'npc_speak',
            ts: 123
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
            relationshipDelta: 2,
            ts: 456
        });
        store.upsertPersonaImpression({
            playerId: 'player-a',
            npcId: 'doudou',
            impression: '喜欢聊天，偏爱亮色。',
            relationshipValue: 5,
            updatedTs: 789
        });

        const summaries = store.listSessionSummaries({playerId: 'player-a'});
        expect(summaries).to.have.length(1);
        expect(summaries[0].expectation).to.contain('亮');
        expect(store.getPersonaImpression('player-a', 'doudou')).to.include({
            playerId: 'player-a',
            npcId: 'doudou',
            impression: '喜欢聊天，偏爱亮色。',
            relationshipValue: 5,
            updatedTs: 789
        });
    });
});
