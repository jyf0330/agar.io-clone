/*jshint expr:true */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agar-memory-summary-'));
process.env.MEMORY_DB_PATH = path.join(tmpRoot, 'memory.db');

const store = require('../../apps/server/src/memory/store');
const summarizer = require('../../apps/server/src/memory/session-summarizer');

function createNpc(id, name) {
    return {
        id: id,
        player: {
            name: name
        },
        personality: {
            anchorsText: 'anchors:\n  facts:\n    - "我会记得玩家来过"\n'
        }
    };
}

describe('memory session summarizer', () => {
    it('should write one L2 summary per npc when the llm succeeds', async () => {
        const sessionId = 'summary-ok';
        const npcs = [
            createNpc('mochi', '麻薯'),
            createNpc('doudou', '豆豆'),
            createNpc('wugui', '乌龟')
        ];

        npcs.forEach((npc) => {
            store.recordEvent({
                playerId: 'player-a',
                npcId: npc.id,
                sessionId: sessionId,
                kind: 'npc_chat_reply',
                payload: {
                    text: npc.player.name + '回应了玩家'
                },
                ts: 1000
            });
        });

        await summarizer.summarizeSession({
            npcs: npcs,
            sessionId: sessionId,
            playerId: 'player-a',
            store: store,
            ask(promptId, params) {
                return Promise.resolve({
                    ok: true,
                    text: '关系+1，主色偏粉，' + params.npcId + '回应玩家、靠近、观察，感觉温和。',
                    source: 'llm'
                });
            },
            ts: 2000
        });

        const summaries = store.listSessionSummaries({
            sessionId: sessionId,
            playerId: 'player-a',
            limit: 10
        });

        expect(summaries.length).to.equal(3);
        expect(summaries.map((summary) => summary.npcId).sort()).to.deep.equal(['doudou', 'mochi', 'wugui']);
        expect(summaries.every((summary) => summary.summary.length <= 80)).to.equal(true);
    });

    it('should write fallback summaries when the llm is offline', async () => {
        const sessionId = 'summary-fallback';
        const npc = createNpc('mochi', '麻薯');

        store.recordEvent({
            playerId: 'player-b',
            npcId: npc.id,
            sessionId: sessionId,
            kind: 'npc_intent',
            payload: {
                type: 'move_to'
            },
            ts: 3000
        });

        await summarizer.summarizeSession({
            npcs: [npc],
            sessionId: sessionId,
            playerId: 'player-b',
            store: store,
            ask() {
                return Promise.reject(new Error('offline'));
            },
            ts: 4000
        });

        const summaries = store.listSessionSummaries({
            sessionId: sessionId,
            npcId: npc.id,
            limit: 10
        });

        expect(summaries.length).to.equal(1);
        expect(summaries[0].summary).to.not.equal('');
        expect(summaries[0].summary).to.contain('麻薯');
    });
});
