/*jshint expr:true */

const expect = require('chai').expect;

const {Player} = require('../../apps/server/src/map/player');
const NpcState = require('../../apps/server/src/npc/npc');
const Orchestrator = require('../../apps/server/src/npc/orchestrator');
const {randomWalkIntent} = require('../../apps/server/src/npc/fallback');

function createPersonality(overrides) {
    return Object.assign({
        id: 'mochi',
        name: 'Mochi',
        color: '#FF6B9D',
        skeleton: 'skeleton-b-blob',
        previewDataUrl: 'data:image/png;base64,AA==',
        anchors: {
            facts: ['我喜欢安静的颜色'],
            catchphrases: ['嗯……'],
            taboos: ['不谈论死亡']
        },
        anchorsText: 'anchors:\n  facts:\n    - "我喜欢安静的颜色"\n'
    }, overrides || {});
}

function createHumanPlayer() {
    const player = new Player('human');
    player.init({ x: 280, y: 320 }, 10);
    player.name = 'Alice';
    player.target = { x: 0, y: 0 };
    return player;
}

describe('npc orchestrator', () => {
    it('should keep fallback random walks inside the map bounds', () => {
        const npc = {
            position: { x: 12, y: 18 }
        };

        const intent = randomWalkIntent(npc, {
            width: 500,
            height: 400
        });

        expect(intent.type).to.equal('move_to');
        expect(intent.params.x).to.be.at.least(0);
        expect(intent.params.x).to.be.at.most(500);
        expect(intent.params.y).to.be.at.least(0);
        expect(intent.params.y).to.be.at.most(400);
    });

    it('should apply a parsed move intent to the registered npc', async () => {
        const npc = new NpcState({
            id: 'mochi',
            personality: createPersonality(),
            spawn: { x: 100, y: 120 },
            defaultPlayerMass: 10
        });
        const humanPlayer = createHumanPlayer();
        const orchestrator = new Orchestrator({
            ask() {
                return Promise.resolve({
                    ok: true,
                    text: JSON.stringify({
                        intent: 'move_to',
                        params: {
                            x: 240,
                            y: 260
                        },
                        reason: '靠近玩家'
                    }),
                    source: 'llm'
                });
            },
            mapWidth: 500,
            mapHeight: 400,
            maxCallsPerSec: 5
        });

        orchestrator.registerNpc(npc);
        await orchestrator.tick({
            players: [humanPlayer, npc.player]
        }, 1000);

        expect(npc.currentIntent.type).to.equal('move_to');
        expect(npc.currentIntent.params.x).to.equal(240);
        expect(npc.currentIntent.params.y).to.equal(260);
        expect(npc.player.target.x).to.equal(140);
        expect(npc.player.target.y).to.equal(140);
    });

    it('should fall back to random walk when the llm call fails', async () => {
        const npc = new NpcState({
            id: 'mochi',
            personality: createPersonality(),
            spawn: { x: 180, y: 220 },
            defaultPlayerMass: 10
        });
        const humanPlayer = createHumanPlayer();
        const orchestrator = new Orchestrator({
            ask() {
                return Promise.reject(new Error('offline'));
            },
            mapWidth: 500,
            mapHeight: 400,
            maxCallsPerSec: 5
        });

        orchestrator.registerNpc(npc);
        await orchestrator.tick({
            players: [humanPlayer, npc.player]
        }, 1000);

        expect(npc.currentIntent.type).to.equal('move_to');
        expect(npc.currentIntent.params.x).to.be.at.least(0);
        expect(npc.currentIntent.params.x).to.be.at.most(500);
        expect(npc.currentIntent.params.y).to.be.at.least(0);
        expect(npc.currentIntent.params.y).to.be.at.most(400);
    });
});
