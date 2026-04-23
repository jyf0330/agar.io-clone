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
        anchorsText: 'anchors:\n  facts:\n    - "我喜欢安静的颜色"\n',
        behavior: {
            speech_style: '每句话都短一点',
            movement: '缓慢，停顿多',
            painting_preference: '偏爱冷色'
        },
        archetype: '安静诗意'
    }, overrides || {});
}

function createHumanPlayer() {
    const player = new Player('human');
    player.init({ x: 280, y: 320 }, 10);
    player.name = 'Alice';
    player.target = { x: 0, y: 0 };
    return player;
}

function createNpc(id, overrides) {
    return new NpcState(Object.assign({
        id: id,
        personality: createPersonality(Object.assign({
            id: id,
            name: id,
            color: id === 'doudou' ? '#5AA8FF' : id === 'wugui' ? '#4CAF50' : '#FF6B9D',
            skeleton: id === 'doudou' ? 'skeleton-e-bean' : id === 'wugui' ? 'skeleton-f-turtle' : 'skeleton-b-blob',
            behavior: {
                speech_style: id === 'doudou' ? '短句，多感叹号' : id === 'wugui' ? '长句少，稳重' : '每句话都短一点',
                movement: id === 'doudou' ? '快速，喜欢来回跑' : id === 'wugui' ? '中速，稳稳地移动' : '缓慢，停顿多',
                painting_preference: id === 'doudou' ? '爱涂别人' : id === 'wugui' ? '只在局末涂' : '偏爱冷色'
            },
            archetype: id === 'doudou' ? '调皮捣蛋' : id === 'wugui' ? '老成稳重' : '安静诗意'
        }, overrides && overrides.personality)),
        spawn: overrides && overrides.spawn ? overrides.spawn : { x: 100, y: 120 },
        defaultPlayerMass: 10
    }, overrides || {}));
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

    it('should apply a batched json array of intents to three registered npcs', async () => {
        const baseNow = 1700000000000;
        const originalNow = Date.now;
        const events = [];
        const npcA = createNpc('mochi', {spawn: {x: 100, y: 120}});
        const npcB = createNpc('doudou', {spawn: {x: 140, y: 160}});
        const npcC = createNpc('wugui', {spawn: {x: 180, y: 200}});
        const humanPlayer = createHumanPlayer();
        const orchestrator = new Orchestrator({
            ask() {
                return Promise.resolve({
                    ok: true,
                    text: JSON.stringify([
                        {
                            npcId: 'mochi',
                            intent: 'move_to',
                            params: {x: 240, y: 260},
                            reason: '靠近玩家'
                        },
                        {
                            npcId: 'doudou',
                            intent: 'speak',
                            params: {},
                            reason: '打招呼'
                        },
                        {
                            npcId: 'wugui',
                            intent: 'paint',
                            params: {targetId: humanPlayer.id},
                            reason: '局末补一笔'
                        }
                    ]),
                    source: 'llm'
                });
            },
            mapWidth: 500,
            mapHeight: 400,
            maxCallsPerSec: 5,
            emitEvent(name, payload) {
                events.push({name: name, payload: payload});
            },
            paintPlayer() {
                return 'data:image/png;base64,AA==';
            },
            sessionStartedAt: baseNow,
            roundDurationMs: 90000
        });

        npcA.spawnedAt = baseNow;
        npcB.spawnedAt = baseNow;
        npcC.spawnedAt = baseNow;
        npcB.lastSpeakTime = baseNow - 20000;
        npcC.lastPaintTime = baseNow - 30000;

        orchestrator.registerNpc(npcA);
        orchestrator.registerNpc(npcB);
        orchestrator.registerNpc(npcC);

        Date.now = () => baseNow + 65000;
        try {
            await orchestrator.tick({
                players: [humanPlayer, npcA.player, npcB.player, npcC.player],
                matchStartedAt: baseNow,
                roundDurationMs: 90000
            }, 1000);
        } finally {
            Date.now = originalNow;
        }

        expect(npcA.currentIntent.type).to.equal('move_to');
        expect(npcA.currentIntent.params.x).to.equal(240);
        expect(events.some((event) => event.name === 'npc:speak' && event.payload.npcId === 'doudou')).to.equal(true);
        expect(events.some((event) => event.name === 'npc:paint' && event.payload.npcId === 'wugui')).to.equal(true);
    });

    it('should keep doudou chattier than wugui and mochi during fallback ticks', async () => {
        const baseNow = 1700000000000;
        const originalNow = Date.now;
        const events = [];
        const humanPlayer = createHumanPlayer();
        const mochi = createNpc('mochi', {spawn: {x: 100, y: 120}});
        const doudou = createNpc('doudou', {spawn: {x: 160, y: 180}});
        const wugui = createNpc('wugui', {spawn: {x: 220, y: 240}});
        const orchestrator = new Orchestrator({
            ask() {
                return Promise.reject(new Error('offline'));
            },
            mapWidth: 500,
            mapHeight: 400,
            maxCallsPerSec: 5,
            emitEvent(name, payload) {
                events.push({name: name, payload: payload, at: Date.now()});
            },
            paintPlayer() {
                return 'data:image/png;base64,AA==';
            },
            sessionStartedAt: baseNow,
            roundDurationMs: 90000
        });

        Date.now = () => baseNow;
        mochi.spawnedAt = baseNow;
        doudou.spawnedAt = baseNow;
        wugui.spawnedAt = baseNow;

        orchestrator.registerNpc(mochi);
        orchestrator.registerNpc(doudou);
        orchestrator.registerNpc(wugui);

        try {
            for (let second = 1; second <= 75; second += 1) {
                Date.now = () => baseNow + (second * 1000);
                await orchestrator.tick({
                    players: [humanPlayer, mochi.player, doudou.player, wugui.player],
                    matchStartedAt: baseNow,
                    roundDurationMs: 90000
                }, 1000);
            }
        } finally {
            Date.now = originalNow;
        }

        const speakCounts = events.reduce((counts, event) => {
            if (event.name === 'npc:speak') {
                counts[event.payload.npcId] = (counts[event.payload.npcId] || 0) + 1;
            }
            return counts;
        }, {});
        const wuguiPaintTimes = events
            .filter((event) => event.name === 'npc:paint' && event.payload.npcId === 'wugui')
            .map((event) => event.at - baseNow);

        expect((speakCounts.doudou || 0)).to.be.greaterThan(speakCounts.wugui || 0);
        expect((speakCounts.wugui || 0)).to.be.greaterThan(speakCounts.mochi || 0);
        expect(wuguiPaintTimes.length).to.be.greaterThan(0);
        expect(wuguiPaintTimes.every((elapsedMs) => elapsedMs >= 60000)).to.equal(true);
    });
});
