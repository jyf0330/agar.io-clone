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

    it('should inject bounded L2 and L3 memory into npc prompts', async () => {
        const npc = new NpcState({
            id: 'mochi',
            personality: createPersonality(),
            spawn: { x: 100, y: 120 },
            defaultPlayerMass: 10
        });
        const humanPlayer = createHumanPlayer();
        humanPlayer.materializationStage = 'PARTIAL';
        humanPlayer.setActivePet({
            petId: 'doudou',
            name: 'Doudou',
            personality: '调皮捣蛋'
        });
        let capturedPrompt = null;
        const orchestrator = new Orchestrator({
            ask(_promptId, _params, options) {
                capturedPrompt = options.prompt;
                return Promise.resolve({
                    ok: true,
                    text: JSON.stringify({
                        intent: 'move_to',
                        params: {
                            x: 240,
                            y: 260
                        },
                        reason: '记得玩家'
                    }),
                    source: 'llm'
                });
            },
            memoryStore: {
                listSessionSummaries(filters) {
                    expect(filters.limit).to.equal(3);
                    return [
                        {summary: '第一局玩家画了蓝色'},
                        {summary: '第二局玩家回来问候'},
                        {summary: '第三局玩家靠近麻薯'},
                        {summary: '第四局不应该进入 prompt'}
                    ];
                },
                getPersonaImpression() {
                    return {
                        impression: '玩家喜欢蓝绿色，会温和地靠近。',
                        evidenceEventIds: ['l1-blue', 'l1-greeting']
                    };
                }
            },
            mapWidth: 500,
            mapHeight: 400,
            maxCallsPerSec: 5
        });

        orchestrator.registerNpc(npc);
        await orchestrator.tick({
            players: [humanPlayer, npc.player],
            partLoot: [{
                x: 300,
                y: 330,
                part: {
                    partType: 'HAND',
                    displayName: 'Thread Hand',
                    stats: {pickupRange: 10},
                    sourceType: 'ghost_echo'
                }
            }],
            ghostDebug: {
                triggerRadius: 800,
                anchors: [{
                    x: 310,
                    y: 335,
                    t: 1200,
                    eventType: 'part_pickup',
                    inTimeWindow: true
                }]
            }
        }, 1000);

        expect(capturedPrompt.system).to.contain('玩家喜欢蓝绿色');
        expect(capturedPrompt.system).to.contain('l1-blue');
        expect(capturedPrompt.system).to.contain('第一局玩家画了蓝色');
        expect(capturedPrompt.system).to.contain('第三局玩家靠近麻薯');
        expect(capturedPrompt.system).to.not.contain('第四局不应该进入 prompt');
        expect(capturedPrompt.user).to.contain('玩家实体化阶段：PARTIAL');
        expect(capturedPrompt.user).to.contain('当前跟宠：doudou');
        expect(capturedPrompt.user).to.contain('Thread Hand');
        expect(capturedPrompt.user).to.contain('part_pickup');
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
        const memoryEvents = [];
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
            recordEvent(event) {
                memoryEvents.push(event);
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
        expect(memoryEvents.some((event) => event.kind === 'npc_intent' && event.npcId === 'mochi' && event.payload.source === 'llm')).to.equal(true);
        expect(memoryEvents.some((event) => event.kind === 'npc_speak' && event.npcId === 'doudou')).to.equal(true);
        expect(memoryEvents.some((event) => event.kind === 'npc_paint' && event.npcId === 'wugui')).to.equal(true);
        expect(memoryEvents.every((event) => event.sessionId === String(baseNow))).to.equal(true);
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

    it('should broadcast reply lines for a fresh player chat message', async () => {
        const baseNow = 1700001000000;
        const originalNow = Date.now;
        const events = [];
        const humanPlayer = createHumanPlayer();
        const mochi = createNpc('mochi', {spawn: {x: 100, y: 120}});
        const doudou = createNpc('doudou', {spawn: {x: 160, y: 180}});
        const wugui = createNpc('wugui', {spawn: {x: 220, y: 240}});
        const orchestrator = new Orchestrator({
            ask(promptId) {
                if (promptId === 'npc_reply_to_player') {
                    return Promise.resolve({
                        ok: true,
                        text: JSON.stringify([
                            {npcId: 'mochi', text: '我喜欢蓝绿。'},
                            {npcId: 'doudou', text: '我今天都喜欢!!'},
                            {npcId: 'wugui', text: '看心情，不必急。'}
                        ]),
                        source: 'llm'
                    });
                }

                return Promise.resolve({
                    ok: true,
                    text: '[]',
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

        Date.now = () => baseNow;
        mochi.spawnedAt = baseNow;
        doudou.spawnedAt = baseNow;
        wugui.spawnedAt = baseNow;

        orchestrator.registerNpc(mochi);
        orchestrator.registerNpc(doudou);
        orchestrator.registerNpc(wugui);

        try {
            Date.now = () => baseNow + 2000;
            await orchestrator.tick({
                players: [humanPlayer, mochi.player, doudou.player, wugui.player],
                recentChats: [{
                    ts: baseNow + 1000,
                    playerId: humanPlayer.id,
                    playerName: humanPlayer.name,
                    message: '你喜欢什么颜色'
                }],
                matchStartedAt: baseNow,
                roundDurationMs: 90000
            }, 1000);
        } finally {
            Date.now = originalNow;
        }

        expect(events.filter((event) => event.name === 'npc:speak').length).to.equal(3);
        expect(events.some((event) => event.payload.npcId === 'mochi' && event.payload.text === '我喜欢蓝绿。')).to.equal(true);
        expect(orchestrator.lastHandledChatTs).to.equal(baseNow + 1000);
    });

    it('should answer quick pet questions with active pet context and LLM prompt', async () => {
        const baseNow = 1700001500000;
        const originalNow = Date.now;
        const events = [];
        const memoryEvents = [];
        const humanPlayer = createHumanPlayer();
        const mochi = createNpc('mochi', {spawn: {x: 100, y: 120}});
        const doudou = createNpc('doudou', {spawn: {x: 160, y: 180}});
        let capturedPrompt = null;
        humanPlayer.setActivePet({
            petId: 'doudou',
            name: 'Doudou',
            personality: '调皮捣蛋'
        });
        const orchestrator = new Orchestrator({
            ask(promptId, params, options) {
                if (promptId === 'pet_question_reply') {
                    capturedPrompt = options.prompt;
                    expect(params.petContext.nearbyPartLoot[0].displayName).to.equal('Echo Hand');
                    return Promise.resolve({
                        ok: true,
                        text: '东南有Echo手。',
                        source: 'llm'
                    });
                }

                return Promise.resolve({
                    ok: true,
                    text: '[]',
                    source: 'llm'
                });
            },
            memoryStore: {
                listSessionSummaries() {
                    return [{summary: '上局一起捡了手。'}];
                },
                getPersonaImpression() {
                    return {impression: '玩家爱追回声。'};
                }
            },
            recordEvent(event) {
                memoryEvents.push(event);
            },
            mapWidth: 500,
            mapHeight: 400,
            maxCallsPerSec: 5,
            emitEvent(name, payload) {
                events.push({name: name, payload: payload});
            },
            sessionStartedAt: baseNow,
            roundDurationMs: 90000
        });

        Date.now = () => baseNow;
        mochi.spawnedAt = baseNow;
        doudou.spawnedAt = baseNow;
        orchestrator.registerNpc(mochi);
        orchestrator.registerNpc(doudou);

        try {
            Date.now = () => baseNow + 2000;
            await orchestrator.tick({
                players: [humanPlayer, mochi.player, doudou.player],
                partLoot: [{
                    x: humanPlayer.x + 140,
                    y: humanPlayer.y + 120,
                    part: {
                        partType: 'HAND',
                        displayName: 'Echo Hand',
                        stats: {pickupRange: 10},
                        sourceType: 'ghost_echo'
                    }
                }],
                ghostDebug: {
                    triggerRadius: 800,
                    anchors: [{
                        x: humanPlayer.x + 120,
                        y: humanPlayer.y + 90,
                        t: 1200,
                        eventType: 'part_pickup',
                        inTimeWindow: true
                    }]
                },
                recentChats: [{
                    ts: baseNow + 1000,
                    playerId: humanPlayer.id,
                    playerName: humanPlayer.name,
                    message: '哪里有回声？'
                }],
                matchStartedAt: baseNow,
                roundDurationMs: 90000
            }, 1000);
        } finally {
            Date.now = originalNow;
        }

        expect(events).to.have.length(1);
        expect(events[0].payload.npcId).to.equal('doudou');
        expect(events[0].payload.text).to.equal('东南有Echo手。');
        expect(capturedPrompt.user).to.contain('Echo Hand');
        expect(capturedPrompt.user).to.contain('part_pickup');
        expect(capturedPrompt.system).to.contain('上局一起捡了手');
        expect(memoryEvents.some((event) => event.kind === 'chat_turn' && event.npcId === 'doudou')).to.equal(true);
        expect(memoryEvents[0]).to.include({
            eventType: 'chat_turn',
            mapId: 'fixed-arena',
            x: humanPlayer.x,
            y: humanPlayer.y,
            createdAt: baseNow + 2000
        });
        expect(memoryEvents[0].eventId).to.contain('l1:');
        expect(memoryEvents[0].eventId).to.contain(':chat_turn:');
        expect(orchestrator.lastHandledChatTs).to.equal(baseNow + 1000);
    });

    it('should move doudou toward the player when asked to come over', async () => {
        const baseNow = 1700002000000;
        const originalNow = Date.now;
        const events = [];
        const humanPlayer = createHumanPlayer();
        const mochi = createNpc('mochi', {spawn: {x: 100, y: 120}});
        const doudou = createNpc('doudou', {spawn: {x: 160, y: 180}});
        const wugui = createNpc('wugui', {spawn: {x: 220, y: 240}});
        const orchestrator = new Orchestrator({
            ask(promptId) {
                if (promptId === 'npc_reply_to_player') {
                    return Promise.reject(new Error('offline'));
                }

                return Promise.resolve({
                    ok: true,
                    text: '[]',
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

        Date.now = () => baseNow;
        mochi.spawnedAt = baseNow;
        doudou.spawnedAt = baseNow;
        wugui.spawnedAt = baseNow;

        orchestrator.registerNpc(mochi);
        orchestrator.registerNpc(doudou);
        orchestrator.registerNpc(wugui);

        try {
            Date.now = () => baseNow + 3000;
            await orchestrator.tick({
                players: [humanPlayer, mochi.player, doudou.player, wugui.player],
                recentChats: [{
                    ts: baseNow + 2000,
                    playerId: humanPlayer.id,
                    playerName: humanPlayer.name,
                    message: '你能走过来吗'
                }],
                matchStartedAt: baseNow,
                roundDurationMs: 90000
            }, 1000);
        } finally {
            Date.now = originalNow;
        }

        expect(events.filter((event) => event.name === 'npc:speak').length).to.equal(3);
        expect(doudou.currentIntent.type).to.equal('move_to');
        expect(doudou.currentIntent.params.x).to.be.closeTo(humanPlayer.x, 80);
        expect(doudou.currentIntent.params.y).to.be.closeTo(humanPlayer.y, 80);
    });
});
