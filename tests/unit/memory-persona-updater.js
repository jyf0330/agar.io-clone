/*jshint expr:true */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agar-memory-persona-'));
process.env.MEMORY_DB_PATH = path.join(tmpRoot, 'memory.db');

const store = require('../../apps/server/src/memory/store');
const updater = require('../../apps/server/src/memory/persona-updater');

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

function seedSummaries(npcId, playerId, count) {
    for (let index = 1; index <= count; index += 1) {
        store.addSessionSummary({
            playerId: playerId,
            npcId: npcId,
            sessionId: 'session-' + index,
            summary: '第' + index + '局，玩家给了' + npcId + '一次温和互动。',
            relationshipDelta: 1,
            ts: index
        });
    }
}

describe('memory persona updater', () => {
    it('should skip until the fifth session summary', async () => {
        const npc = createNpc('mochi', '麻薯');

        seedSummaries(npc.id, 'player-a', 4);

        const result = await updater.updateNpcPersona({
            npc: npc,
            playerId: 'player-a',
            store: store,
            ask() {
                throw new Error('should not ask before five summaries');
            }
        });

        expect(result.skipped).to.equal(true);
        expect(store.getPersonaImpression('player-a', npc.id)).to.equal(null);
    });

    it('should update the persona impression on every fifth summary', async () => {
        const npc = createNpc('doudou', '豆豆');
        let calls = 0;

        seedSummaries(npc.id, 'player-b', 5);
        await updater.updateNpcPersona({
            npc: npc,
            playerId: 'player-b',
            store: store,
            ask() {
                calls += 1;
                return Promise.resolve({
                    ok: true,
                    text: '{"impression":"玩家喜欢亮色，会主动找豆豆说话。","relationshipValue":7}',
                    source: 'llm'
                });
            },
            ts: 100
        });

        let impression = store.getPersonaImpression('player-b', npc.id);
        expect(calls).to.equal(1);
        expect(impression.impression).to.contain('亮色');
        expect(impression.relationshipValue).to.equal(7);

        seedSummaries(npc.id, 'player-b', 5);
        await updater.updateNpcPersona({
            npc: npc,
            playerId: 'player-b',
            store: store,
            ask() {
                calls += 1;
                return Promise.resolve({
                    ok: true,
                    text: '{"impression":"玩家连续多局回来，豆豆更愿意靠近。","relationshipValue":13}',
                    source: 'llm'
                });
            },
            ts: 200
        });

        impression = store.getPersonaImpression('player-b', npc.id);
        expect(calls).to.equal(2);
        expect(impression.relationshipValue).to.equal(13);
        expect(impression.impression).to.contain('连续多局');
    });

    it('should write a deterministic fallback impression offline', async () => {
        const npc = createNpc('wugui', '乌龟');

        seedSummaries(npc.id, 'player-c', 5);
        const result = await updater.updateNpcPersona({
            npc: npc,
            playerId: 'player-c',
            store: store,
            ask() {
                return Promise.reject(new Error('offline'));
            },
            ts: 300
        });

        const impression = store.getPersonaImpression('player-c', npc.id);
        expect(result.skipped).to.equal(false);
        expect(impression.impression).to.contain('乌龟');
        expect(impression.relationshipValue).to.equal(5);
    });
});
