'use strict';

const wrapper = require('../llm/wrapper');
const {randomWalkIntent} = require('./fallback');
const {buildNpcIntentPrompt, buildNpcUtterPrompt, buildNpcReplyPrompt, buildPetQuestionPrompt} = require('./prompts');
const {buildContextualFallbackUtterance} = require('./greetings');

const PET_SUGGESTION_RESPONSE_WINDOW_MS = 30000;

function getTimeOfDayLabel(date) {
    const hour = date.getHours();
    if (hour < 6) {
        return '凌晨';
    }
    if (hour < 12) {
        return '早晨';
    }
    if (hour < 18) {
        return '下午';
    }

    return '夜晚';
}

function parseJsonPayload(text) {
    const rawText = String(text || '').trim();
    if (!rawText) {
        return null;
    }

    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fencedMatch ? fencedMatch[1].trim() : rawText;
    return JSON.parse(jsonText);
}

function estimatePromptTokens(prompt) {
    const payload = [
        prompt && prompt.system ? prompt.system : '',
        prompt && prompt.user ? prompt.user : ''
    ].join('\n');

    return Math.ceil(payload.length / 3.5);
}

function getChatFallbackReply(npcId) {
    if (npcId === 'doudou') {
        return '欸?';
    }
    if (npcId === 'wugui') {
        return '……';
    }

    return '嗯……';
}

function isFollowPlayerMessage(message) {
    return /走过来|过来|来这边|靠近我/.test(String(message || ''));
}

function isPetQuestionMessage(message) {
    return /哪里有回声|附近有什么部位|这件部位要不要换|我现在该打还是跑|你记得上一局吗/.test(String(message || ''));
}

function isPetSuggestionRejectionMessage(message) {
    return /^(?:不换|先不换|拒绝|算了|不要|不用换|别换)[。！？!?.\s]*$/.test(String(message || '').trim());
}

function distance(left, right) {
    return Math.hypot((left.x || 0) - (right.x || 0), (left.y || 0) - (right.y || 0));
}

function getDirection(from, to) {
    const dx = (to.x || 0) - (from.x || 0);
    const dy = (to.y || 0) - (from.y || 0);
    const vertical = dy < -80 ? '北' : dy > 80 ? '南' : '';
    const horizontal = dx < -80 ? '西' : dx > 80 ? '东' : '';

    return (vertical + horizontal) || '附近';
}

function summarizeEquipmentSlots(player) {
    const slots = player && player.equipmentSlots ? player.equipmentSlots : {};
    return Object.keys(slots).filter((slotId) => slots[slotId]).map((slotId) => {
        const part = slots[slotId];
        return {
            slotId: slotId,
            partType: part.partType || part.type,
            displayName: part.displayName || part.label || part.templateId || part.partId || 'part',
            stats: Object.assign({}, part.stats || {}),
            sourceType: part.sourceType || ''
        };
    });
}

function summarizeMapPartSpawnTendency(gameState) {
    const settings = gameState && gameState.partLootConfig ? gameState.partLootConfig : {};
    const templates = Array.isArray(settings.templates) ? settings.templates : [];

    return {
        enabled: settings.enabled !== false && templates.length > 0,
        maxWorldParts: typeof settings.maxWorldParts === 'number' ? settings.maxWorldParts : 0,
        spawnBatch: typeof settings.spawnBatch === 'number' ? settings.spawnBatch : 0,
        templates: templates.slice(0, 5).map((template) => {
            return {
                partType: template.partType || template.type || 'HAND',
                displayName: template.displayName || template.label || template.templateId || template.type || 'part',
                stats: Object.assign({}, template.stats || {})
            };
        })
    };
}

function buildPetContext(anchorPlayer, gameState) {
    const safeState = gameState || {};
    const playerPosition = {
        x: anchorPlayer.x || 0,
        y: anchorPlayer.y || 0
    };
    const nearbyPartLoot = (safeState.partLoot || []).filter((loot) => distance(playerPosition, loot) <= 500).slice(0, 3).map((loot) => {
        const part = loot.part || {};
        return {
            x: Math.round(loot.x),
            y: Math.round(loot.y),
            partType: part.partType || part.type,
            displayName: part.displayName || part.label || part.templateId || 'part',
            stats: Object.assign({}, part.stats || {}),
            sourceType: part.sourceType || loot.source || ''
        };
    });
    const ghostDebug = safeState.ghostDebug || {};
    const upcomingEchoes = (ghostDebug.anchors || []).filter((anchor) => {
        return anchor.inTimeWindow || distance(playerPosition, anchor) <= (ghostDebug.triggerRadius || 800);
    }).slice(0, 3).map((anchor) => {
        return {
            x: Math.round(anchor.x),
            y: Math.round(anchor.y),
            t: anchor.t,
            eventType: anchor.eventType || 'anchor',
            inTimeWindow: Boolean(anchor.inTimeWindow)
        };
    });

    return {
        equipment: summarizeEquipmentSlots(anchorPlayer),
        materializationStage: anchorPlayer.materializationStage || 'HOLLOW',
        activePet: anchorPlayer.activePet || null,
        nearbyPartLoot: nearbyPartLoot,
        upcomingEchoes: upcomingEchoes,
        mapPartSpawnTendency: summarizeMapPartSpawnTendency(safeState),
        shortSlots: summarizeEquipmentSlots(anchorPlayer).filter((entry) => !entry.stats || !Object.keys(entry.stats).length).slice(0, 3)
    };
}

function getMockChatReply(npcId, latestChat) {
    const message = String(latestChat && latestChat.message ? latestChat.message : '');
    if (/颜色/.test(message)) {
        if (npcId === 'doudou') {
            return '今天彩一点!!';
        }
        if (npcId === 'wugui') {
            return '看心情，稳一点。';
        }

        return '蓝绿比较轻。';
    }

    if (isFollowPlayerMessage(message)) {
        if (npcId === 'doudou') {
            return '好呀，我来了!!';
        }
        if (npcId === 'wugui') {
            return '我会靠近一些。';
        }

        return '我慢慢过去。';
    }

    return getChatFallbackReply(npcId);
}

function hasMemoryEvidence(memory) {
    const safeMemory = memory || {};
    return Boolean(
        (Array.isArray(safeMemory.summaries) && safeMemory.summaries.some(hasSummaryEvidence))
        || hasPersonaEvidence(safeMemory.impression)
    );
}

function hasSummaryEvidence(summary) {
    return Boolean(summary && Array.isArray(summary.referencedL1EventIds) && summary.referencedL1EventIds.length);
}

function hasPersonaEvidence(impression) {
    return Boolean(impression && impression.impression && Array.isArray(impression.evidenceEventIds) && impression.evidenceEventIds.length);
}

function buildPetQuestionFallbackReply(question, petContext, memory, anchorPlayer) {
    const context = petContext || {};
    const playerPosition = anchorPlayer || {x: 0, y: 0};
    const echoes = Array.isArray(context.upcomingEchoes) ? context.upcomingEchoes : [];
    const loot = Array.isArray(context.nearbyPartLoot) ? context.nearbyPartLoot : [];
    const message = String(question || '');

    if (/哪里有回声/.test(message)) {
        if (!echoes.length) {
            return '暂时没闻到回声。';
        }
        return getDirection(playerPosition, echoes[0]) + '有回声。';
    }

    if (/附近有什么部位/.test(message)) {
        if (!loot.length) {
            return '附近没看到部位。';
        }
        return getDirection(playerPosition, loot[0]) + '有' + String(loot[0].displayName || loot[0].partType || '部位').slice(0, 5) + '。';
    }

    if (/这件部位要不要换/.test(message)) {
        if (!loot.length) {
            return '先别换，没目标。';
        }
        const stats = loot[0].stats || {};
        const statName = Object.keys(stats)[0];
        if (!statName) {
            return '属性不明，先观望。';
        }
        return statName + '+' + stats[statName] + '，可换。';
    }

    if (/我现在该打还是跑/.test(message)) {
        if (context.materializationStage === 'REAL' || context.materializationStage === 'OVERREAL') {
            return '能打，但别贪。';
        }
        return '先跑，补部位。';
    }

    if (/你记得上一局吗/.test(message)) {
        if (!hasMemoryEvidence(memory)) {
            return '还没有共同记忆。';
        }
        const summary = memory.summaries && memory.summaries[0] ? memory.summaries[0].summary : memory.impression.impression;
        return '记得，' + String(summary || '').slice(0, 10);
    }

    return '我先保守点。';
}

class Orchestrator {
    constructor(config) {
        const settings = config || {};

        this.config = Object.assign({
            maxCallsPerSec: 5,
            timeoutMs: 4000,
            mapWidth: 5000,
            mapHeight: 5000,
            roundDurationMs: 90000,
            sessionStartedAt: Date.now(),
            maxPromptTokens: 2000,
            memoryCacheTtlMs: 10000,
            recordLlmIntents: true,
            recordRoutineIntents: false,
            routineIntentRecordIntervalMs: 10000,
            useMemoryInRoutineTicks: true,
            ask: wrapper.ask,
            emitEvent: null,
            recordEvent: null,
            memoryStore: null,
            paintPlayer: null
        }, settings);
        this.npcs = [];
        this.callTimestamps = [];
        this.lastHandledChatTs = 0;
        this.pendingChatIntents = {};
        this.memoryCache = {};
        this.lastRoutineIntentRecordAt = {};
    }

    registerNpc(npc) {
        this.npcs.push(npc);
        return npc;
    }

    pruneCallBudget(now) {
        this.callTimestamps = this.callTimestamps.filter((ts) => now - ts < 1000);
    }

    consumeCallBudget(now) {
        this.pruneCallBudget(now);
        if (this.callTimestamps.length >= this.config.maxCallsPerSec) {
            return false;
        }

        this.callTimestamps.push(now);
        return true;
    }

    getBehaviorProfile(npc) {
        return npc && npc.behaviorProfile ? npc.behaviorProfile : {
            speechCooldownMs: 18000,
            paintCooldownMs: 22000,
            movementStrideMultiplier: 1,
            movementSpeedMultiplier: 1,
            paintEndgameOnly: false,
            avoidIdle: false,
            actionPriority: ['speak', 'paint']
        };
    }

    getRoundState(gameState, now) {
        const safeState = gameState || {};
        const startedAt = safeState.matchStartedAt || this.config.sessionStartedAt || now;
        const roundDurationMs = safeState.roundDurationMs || this.config.roundDurationMs;
        const elapsedMs = Math.max(0, now - startedAt);
        const remainingMs = Math.max(0, roundDurationMs - elapsedMs);

        return {
            startedAt: startedAt,
            elapsedMs: elapsedMs,
            remainingMs: remainingMs,
            isEndgame: remainingMs <= 30000
        };
    }

    getAnchorPlayer(gameState) {
        const players = gameState && Array.isArray(gameState.players) ? gameState.players : [];
        return players.find((player) => !player.isNpc) || null;
    }

    getMemoryForNpc(npc, gameState) {
        const memoryStore = this.config.memoryStore;
        const anchorPlayer = this.getAnchorPlayer(gameState);
        if (!memoryStore || !anchorPlayer || !npc) {
            return {
                summaries: [],
                impression: null
            };
        }

        const now = Date.now();
        const cacheKey = [anchorPlayer.id, npc.id].join(':');
        const cachedMemory = this.memoryCache[cacheKey];
        if (cachedMemory && now - cachedMemory.loadedAt < this.config.memoryCacheTtlMs) {
            return cachedMemory.value;
        }

        try {
            const summaries = memoryStore.listSessionSummaries({
                playerId: anchorPlayer.id,
                npcId: npc.id,
                limit: 3
            }) || [];
            const impression = memoryStore.getPersonaImpression(anchorPlayer.id, npc.id);

            const value = {
                summaries: summaries.filter(hasSummaryEvidence),
                impression: hasPersonaEvidence(impression) ? impression : null
            };
            this.memoryCache[cacheKey] = {
                loadedAt: now,
                value: value
            };
            return value;
        } catch (error) {
            console.warn('[NPC] memory recall failed', error.message);
            return {
                summaries: [],
                impression: null
            };
        }
    }

    shouldRecordNpcIntent(npc, source, now) {
        if (source === 'chat') {
            return true;
        }
        if (source === 'llm' && this.config.recordLlmIntents !== false) {
            return true;
        }
        if (this.config.recordRoutineIntents !== true) {
            return false;
        }

        const npcId = npc && npc.id ? npc.id : 'npc';
        const lastRecordedAt = this.lastRoutineIntentRecordAt[npcId];
        if (typeof lastRecordedAt !== 'number') {
            this.lastRoutineIntentRecordAt[npcId] = now;
            return true;
        }
        if (now - lastRecordedAt < this.config.routineIntentRecordIntervalMs) {
            return false;
        }

        this.lastRoutineIntentRecordAt[npcId] = now;
        return true;
    }

    buildMemoryByNpc(gameState) {
        return this.npcs.reduce((memoryMap, npc) => {
            memoryMap[npc.id] = this.getMemoryForNpc(npc, gameState);
            return memoryMap;
        }, {});
    }

    getSessionId(gameState) {
        return (gameState && gameState.sessionId) || this.config.sessionId || String(this.config.sessionStartedAt || 'session');
    }

    recordNpcEvent(kind, npc, gameState, payload, playerId) {
        if (typeof this.config.recordEvent !== 'function') {
            return;
        }

        const anchorPlayer = this.getAnchorPlayer(gameState);
        const now = Date.now();
        const npcId = npc && npc.id ? npc.id : '';
        const ownerPlayerId = playerId || (anchorPlayer && anchorPlayer.id) || '';
        try {
            this.config.recordEvent({
                eventId: [
                    'l1',
                    this.getSessionId(gameState),
                    ownerPlayerId || 'player',
                    npcId || 'npc',
                    kind,
                    now
                ].join(':'),
                kind: kind,
                eventType: kind,
                npcId: npcId,
                playerId: ownerPlayerId,
                sessionId: this.getSessionId(gameState),
                mapId: (gameState && gameState.mapId) || this.config.mapId || 'fixed-arena',
                x: anchorPlayer && typeof anchorPlayer.x === 'number' ? anchorPlayer.x : null,
                y: anchorPlayer && typeof anchorPlayer.y === 'number' ? anchorPlayer.y : null,
                payload: Object.assign({
                    npcName: npc && npc.player ? npc.player.name : ''
                }, payload || {}),
                ts: now,
                createdAt: now
            });
        } catch (error) {
            console.warn('[NPC] memory event write failed', error.message);
        }
    }

    buildBatchContext(npcs, gameState) {
        const players = gameState && Array.isArray(gameState.players) ? gameState.players : [];
        const humanPlayers = players.filter((player) => !player.isNpc);
        const anchorPlayer = humanPlayers[0] || {
            x: this.config.mapWidth / 2,
            y: this.config.mapHeight / 2
        };
        const now = new Date();
        const roundState = this.getRoundState(gameState, now.getTime());

        return npcs.map((npc) => {
            npc.syncFromPlayer();
            const behavior = npc.personality && npc.personality.behavior ? npc.personality.behavior : {};

            return {
                npcId: npc.id,
                npcName: npc.player.name,
                archetype: npc.personality && npc.personality.archetype ? npc.personality.archetype : '未定义',
                behavior_summary: [
                    behavior.speech_style || '未定义说话风格',
                    behavior.movement || '未定义移动风格',
                    behavior.painting_preference || '未定义涂画偏好'
                ].join(' / '),
                npc: {
                    x: Math.round(npc.position.x),
                    y: Math.round(npc.position.y)
                },
                player: {
                    x: Math.round(anchorPlayer.x || this.config.mapWidth / 2),
                    y: Math.round(anchorPlayer.y || this.config.mapHeight / 2)
                },
                currentIntent: npc.currentIntent.type,
                time_of_day: getTimeOfDayLabel(now),
                round_phase: roundState.isEndgame ? 'endgame' : 'midgame',
                round_remaining_sec: Math.ceil(roundState.remainingMs / 1000),
                last_player_action: gameState && gameState.lastPlayerAction ? gameState.lastPlayerAction : 'idle',
                petContext: buildPetContext(anchorPlayer, gameState),
                memory: this.config.useMemoryInRoutineTicks === false
                    ? {summaries: [], impression: null}
                    : this.getMemoryForNpc(npc, gameState)
            };
        });
    }

    parseIntents(text) {
        const parsed = parseJsonPayload(text);
        if (!parsed) {
            return [];
        }

        if (Array.isArray(parsed)) {
            return parsed;
        }

        if (parsed.intent) {
            return [parsed];
        }

        return Object.keys(parsed).map((key) => {
            return Object.assign({
                npcId: key
            }, parsed[key]);
        });
    }

    parseReplies(text) {
        const parsed = parseJsonPayload(text);
        if (!parsed) {
            return [];
        }

        if (Array.isArray(parsed)) {
            return parsed;
        }

        if (Array.isArray(parsed.replies)) {
            return parsed.replies;
        }

        return Object.keys(parsed).map((key) => {
            return {
                npcId: key,
                text: parsed[key]
            };
        });
    }

    getActionTimestamp(npc, key) {
        return npc[key] || npc.spawnedAt || 0;
    }

    canNpcSpeak(npc, safeState, now) {
        const profile = this.getBehaviorProfile(npc);
        return now - this.getActionTimestamp(npc, 'lastSpeakTime') >= profile.speechCooldownMs;
    }

    canNpcPaint(npc, safeState, now) {
        const humanPlayers = (safeState.players || []).filter((player) => !player.isNpc);
        const profile = this.getBehaviorProfile(npc);
        const roundState = this.getRoundState(safeState, now);
        if (!humanPlayers.length) {
            return false;
        }
        if (profile.paintEndgameOnly && !roundState.isEndgame) {
            return false;
        }

        return now - this.getActionTimestamp(npc, 'lastPaintTime') >= profile.paintCooldownMs;
    }

    buildRoamIntent(npc, mapSize, safeState) {
        const anchorPlayer = this.getAnchorPlayer(safeState);
        return randomWalkIntent(npc, mapSize, {
            profile: this.getBehaviorProfile(npc),
            basePosition: anchorPlayer ? {
                x: anchorPlayer.x,
                y: anchorPlayer.y
            } : null
        });
    }

    sanitizeMoveIntent(npc, mapSize, safeState, intent) {
        const safeIntent = intent || {};
        const params = safeIntent.params || {};
        const profile = this.getBehaviorProfile(npc);
        const anchorPlayer = this.getAnchorPlayer(safeState);
        if (typeof params.x !== 'number' || typeof params.y !== 'number') {
            return this.buildRoamIntent(npc, mapSize, safeState);
        }

        let targetX = Math.round(Math.min(mapSize.width, Math.max(0, params.x)));
        let targetY = Math.round(Math.min(mapSize.height, Math.max(0, params.y)));
        if (anchorPlayer && typeof profile.followPlayerRadius === 'number') {
            const deltaX = targetX - anchorPlayer.x;
            const deltaY = targetY - anchorPlayer.y;
            const distance = Math.hypot(deltaX, deltaY);
            if (distance > profile.followPlayerRadius && distance > 0) {
                const scale = profile.followPlayerRadius / distance;
                targetX = Math.round(anchorPlayer.x + deltaX * scale);
                targetY = Math.round(anchorPlayer.y + deltaY * scale);
            }
        }

        return {
            type: 'move_to',
            params: {
                x: targetX,
                y: targetY
            },
            reason: safeIntent.reason || ''
        };
    }

    coerceIntent(npc, safeState, mapSize, intent) {
        const profile = this.getBehaviorProfile(npc);
        const safeIntent = intent || {};
        const now = Date.now();

        if (safeIntent.type === 'speak') {
            return this.canNpcSpeak(npc, safeState, now)
                ? {type: 'speak', params: {}, reason: safeIntent.reason || ''}
                : this.buildRoamIntent(npc, mapSize, safeState);
        }

        if (safeIntent.type === 'paint') {
            if (this.canNpcPaint(npc, safeState, now)) {
                return {
                    type: 'paint',
                    params: safeIntent.params || {},
                    reason: safeIntent.reason || ''
                };
            }

            if (profile.avoidIdle && this.canNpcSpeak(npc, safeState, now)) {
                return {
                    type: 'speak',
                    params: {},
                    reason: 'fallback-from-paint'
                };
            }

            return this.buildRoamIntent(npc, mapSize, safeState);
        }

        if (safeIntent.type === 'idle') {
            return profile.avoidIdle ? this.buildRoamIntent(npc, mapSize, safeState) : {
                type: 'idle',
                params: {},
                reason: safeIntent.reason || ''
            };
        }

        if (safeIntent.type === 'move_to') {
            return this.sanitizeMoveIntent(npc, mapSize, safeState, safeIntent);
        }

        return null;
    }

    resolveIntent(parsedIntents, npc, index, mapSize, safeState) {
        const fromList = (parsedIntents || []).find((entry, entryIndex) => {
            return entry && (entry.npcId === npc.id || entry.id === npc.id || entryIndex === index);
        });
        const normalized = fromList || null;
        const intentType = normalized ? (normalized.intent || normalized.type) : null;
        if (normalized && ['move_to', 'idle', 'speak', 'paint'].indexOf(intentType) > -1) {
            return this.coerceIntent(npc, safeState, mapSize, {
                type: intentType,
                params: normalized.params || {},
                reason: normalized.reason || ''
            });
        }

        return null;
    }

    buildFallbackIntent(npc, safeState, mapSize, context) {
        const now = Date.now();
        const humanPlayers = (safeState.players || []).filter((player) => !player.isNpc);
        const profile = this.getBehaviorProfile(npc);
        const actionPriority = Array.isArray(profile.actionPriority) ? profile.actionPriority : ['speak', 'paint'];

        for (const action of actionPriority) {
            if (action === 'speak' && this.canNpcSpeak(npc, safeState, now)) {
                return {
                    type: 'speak',
                    params: {},
                    reason: 'fallback-speak'
                };
            }

            if (action === 'paint' && humanPlayers.length && this.canNpcPaint(npc, safeState, now)) {
                return {
                    type: 'paint',
                    params: {
                        targetId: humanPlayers[0].id,
                        color: npc.color
                    },
                    reason: 'fallback-paint'
                };
            }
        }

        if (npc.currentIntent && npc.currentIntent.type === 'move_to' && !profile.avoidIdle) {
            return npc.currentIntent;
        }

        return this.buildRoamIntent(npc, mapSize, safeState);
    }

    async generateUtterance(npc, context) {
        const prompt = buildNpcUtterPrompt(npc, context);
        const now = Date.now();
        if (estimatePromptTokens(prompt) > this.config.maxPromptTokens || !this.consumeCallBudget(now)) {
            return buildContextualFallbackUtterance(npc, context);
        }

        try {
            const result = await this.config.ask('npc_utter', {
                npcId: npc.id,
                timeOfDay: context.timeOfDay,
                intentType: context.intentType
            }, {
                timeoutMs: Math.min(this.config.timeoutMs, 3000),
                useCache: false,
                prompt: prompt
            });

            if (result && result.ok && result.text && result.text.indexOf('MOCK:') !== 0) {
                return result.text.slice(0, 15);
            }
        } catch (_error) {
            // Offline or provider issues fall through to greetings fallback.
        }

        return buildContextualFallbackUtterance(npc, context);
    }

    async generateChatReplies(latestChat, safeState) {
        const prompt = buildNpcReplyPrompt(this.npcs, safeState.recentChats || [], latestChat, this.buildMemoryByNpc(safeState));
        const fallbackReplies = this.npcs.reduce((replyMap, npc) => {
            replyMap[npc.id] = getChatFallbackReply(npc.id);
            return replyMap;
        }, {});
        const mockReplies = this.npcs.reduce((replyMap, npc) => {
            replyMap[npc.id] = getMockChatReply(npc.id, latestChat);
            return replyMap;
        }, {});
        const now = Date.now();

        if (estimatePromptTokens(prompt) > this.config.maxPromptTokens || !this.consumeCallBudget(now)) {
            return fallbackReplies;
        }

        try {
            const result = await this.config.ask('npc_reply_to_player', {
                latestChat: latestChat,
                recentChats: (safeState.recentChats || []).slice(-5).map((entry) => ({
                    playerName: entry.playerName,
                    message: entry.message,
                    ts: entry.ts
                }))
            }, {
                timeoutMs: Math.min(this.config.timeoutMs, 3500),
                useCache: false,
                prompt: prompt
            });

            if (!result || !result.ok || !result.text) {
                return fallbackReplies;
            }
            if (result.text.indexOf('MOCK:') === 0) {
                return mockReplies;
            }

            const parsedReplies = this.parseReplies(result.text);
            const replyMap = Object.assign({}, fallbackReplies);
            parsedReplies.forEach((entry, index) => {
                const matchedNpc = this.npcs.find((npc) => entry && (entry.npcId === npc.id || entry.id === npc.id))
                    || this.npcs[index];
                const text = entry && typeof entry.text === 'string' ? entry.text.trim() : '';
                if (matchedNpc && text) {
                    replyMap[matchedNpc.id] = text === '不回复' ? fallbackReplies[matchedNpc.id] : text.slice(0, 15);
                }
            });

            return replyMap;
        } catch (_error) {
            return fallbackReplies;
        }
    }

    getActivePetNpc(safeState) {
        const anchorPlayer = this.getAnchorPlayer(safeState);
        const activePetId = anchorPlayer && anchorPlayer.activePet ? anchorPlayer.activePet.petId : null;

        return this.npcs.find((npc) => npc.id === activePetId) || this.npcs[0] || null;
    }

    async generatePetQuestionReply(npc, latestChat, safeState) {
        const anchorPlayer = this.getAnchorPlayer(safeState) || {x: 0, y: 0};
        const petContext = buildPetContext(anchorPlayer, safeState);
        const memory = this.getMemoryForNpc(npc, safeState);
        const fallback = buildPetQuestionFallbackReply(latestChat.message, petContext, memory, anchorPlayer);
        const prompt = buildPetQuestionPrompt(npc, latestChat, petContext, memory);
        const now = Date.now();
        const message = String(latestChat && latestChat.message ? latestChat.message : '');

        if (/你记得上一局吗/.test(message) && !hasMemoryEvidence(memory)) {
            return fallback;
        }

        if (estimatePromptTokens(prompt) > this.config.maxPromptTokens || !this.consumeCallBudget(now)) {
            return fallback;
        }

        try {
            const result = await this.config.ask('pet_question_reply', {
                npcId: npc.id,
                playerId: anchorPlayer.id || '',
                message: latestChat.message,
                petContext: petContext
            }, {
                timeoutMs: Math.min(this.config.timeoutMs, 3500),
                useCache: false,
                prompt: prompt
            });

            if (result && result.ok && result.text && result.text.indexOf('MOCK:') !== 0) {
                return String(result.text).trim().slice(0, 15) || fallback;
            }
        } catch (_error) {
            return fallback;
        }

        return fallback;
    }

    async handlePetQuestion(latestChat, safeState) {
        const npc = this.getActivePetNpc(safeState);
        if (!npc || typeof this.config.emitEvent !== 'function') {
            return false;
        }

        const text = await this.generatePetQuestionReply(npc, latestChat, safeState);
        this.config.emitEvent('npc:speak', {
            npcId: npc.id,
            npcName: npc.player.name,
            text: text,
            duration: 3500
        });
        this.recordNpcEvent('chat_turn', npc, safeState, {
            question: latestChat.message,
            answer: text,
            source: 'active_pet'
        }, latestChat.playerId);
        this.recordPetQuestionFact(npc, latestChat, safeState, text);
        return true;
    }

    recordPetQuestionFact(npc, latestChat, safeState, answerText) {
        const anchorPlayer = this.getAnchorPlayer(safeState) || {x: 0, y: 0};
        const petContext = buildPetContext(anchorPlayer, safeState);
        const message = String(latestChat && latestChat.message ? latestChat.message : '');

        if (/哪里有回声/.test(message) && petContext.upcomingEchoes.length) {
            this.recordNpcEvent('guided_to_echo', npc, safeState, {
                question: message,
                answer: answerText,
                targetEcho: petContext.upcomingEchoes[0]
            }, latestChat.playerId);
            return;
        }

        if (/这件部位要不要换/.test(message) && petContext.nearbyPartLoot.length) {
            this.recordNpcEvent('pet_suggested_part', npc, safeState, {
                question: message,
                answer: answerText,
                suggestedPart: petContext.nearbyPartLoot[0]
            }, latestChat.playerId);
        }
    }

    findRecentPetSuggestion(npc, latestChat, safeState) {
        const memoryStore = this.config.memoryStore;
        const anchorPlayer = this.getAnchorPlayer(safeState);
        if (!memoryStore || typeof memoryStore.listEvents !== 'function' || !npc || !anchorPlayer) {
            return null;
        }

        try {
            const events = memoryStore.listEvents({
                eventType: 'pet_suggested_part',
                playerId: latestChat.playerId || anchorPlayer.id,
                npcId: npc.id,
                sessionId: this.getSessionId(safeState),
                limit: 10
            }) || [];
            const now = Date.now();
            for (let index = events.length - 1; index >= 0; index--) {
                const event = events[index];
                const eventTime = typeof event.ts === 'number' ? event.ts : Number(event.ts || 0);
                if (!eventTime || now - eventTime <= PET_SUGGESTION_RESPONSE_WINDOW_MS) {
                    return event;
                }
            }
        } catch (error) {
            console.warn('[NPC] pet suggestion recall failed', error.message);
        }

        return null;
    }

    handlePetSuggestionRejection(latestChat, safeState) {
        const npc = this.getActivePetNpc(safeState);
        const suggestion = this.findRecentPetSuggestion(npc, latestChat, safeState);
        if (!npc || !suggestion) {
            return false;
        }

        if (typeof this.config.emitEvent === 'function') {
            this.config.emitEvent('npc:speak', {
                npcId: npc.id,
                npcName: npc.player.name,
                text: '那先不换。',
                duration: 2500
            });
        }

        const suggestionPayload = suggestion.payload || {};
        this.recordNpcEvent('player_rejected_pet_suggestion', npc, safeState, {
            message: latestChat.message,
            suggestionEventId: suggestion.eventId || '',
            suggestedPart: suggestionPayload.suggestedPart || null
        }, latestChat.playerId);
        return true;
    }

    queueFollowPlayerIntent(npc, safeState) {
        const anchorPlayer = this.getAnchorPlayer(safeState);
        if (!npc || !anchorPlayer) {
            return;
        }

        this.pendingChatIntents[npc.id] = {
            type: 'move_to',
            params: {
                x: anchorPlayer.x + 40,
                y: anchorPlayer.y + 20
            },
            reason: '响应玩家聊天'
        };
    }

    async handleRecentChats(safeState) {
        const recentChats = Array.isArray(safeState.recentChats) ? safeState.recentChats : [];
        const nextChats = recentChats.filter((entry) => entry && entry.ts > this.lastHandledChatTs);
        if (!nextChats.length) {
            return;
        }

        const latestChat = nextChats.sort((left, right) => left.ts - right.ts).pop();
        if (isPetSuggestionRejectionMessage(latestChat.message) && this.handlePetSuggestionRejection(latestChat, safeState)) {
            this.lastHandledChatTs = latestChat.ts;
            return;
        }

        if (isPetQuestionMessage(latestChat.message) && await this.handlePetQuestion(latestChat, safeState)) {
            this.lastHandledChatTs = latestChat.ts;
            return;
        }

        const replies = await this.generateChatReplies(latestChat, safeState);

        if (typeof this.config.emitEvent === 'function') {
            this.npcs.forEach((npc) => {
                const text = replies[npc.id] || getChatFallbackReply(npc.id);
                this.config.emitEvent('npc:speak', {
                    npcId: npc.id,
                    npcName: npc.player.name,
                    text: text,
                    duration: 3000
                });
                this.recordNpcEvent('npc_chat_reply', npc, safeState, {
                    text: text,
                    latestChat: {
                        playerId: latestChat.playerId,
                        playerName: latestChat.playerName,
                        message: latestChat.message,
                        ts: latestChat.ts
                    }
                }, latestChat.playerId);
            });
        }

        if (isFollowPlayerMessage(latestChat.message)) {
            const preferredNpc = this.npcs.find((npc) => npc.id === 'doudou') || this.npcs[0];
            this.queueFollowPlayerIntent(preferredNpc, safeState);
        }

        this.lastHandledChatTs = latestChat.ts;
    }

    handleNpcSpeak(npc, safeState, context) {
        if (typeof this.config.emitEvent !== 'function') {
            return Promise.resolve();
        }

        return this.generateUtterance(npc, context).then((text) => {
            npc.lastSpeakTime = Date.now();
            this.config.emitEvent('npc:speak', {
                npcId: npc.id,
                npcName: npc.player.name,
                text: text,
                duration: 3000
            });
            this.recordNpcEvent('npc_speak', npc, safeState, {
                text: text,
                context: context
            });
        });
    }

    handleNpcPaint(npc, safeState) {
        const humanPlayers = (safeState.players || []).filter((player) => !player.isNpc);
        const targetPlayer = humanPlayers[0];

        if (!targetPlayer || typeof this.config.paintPlayer !== 'function' || typeof this.config.emitEvent !== 'function') {
            return;
        }

        npc.lastPaintTime = Date.now();
        const previewDataUrl = this.config.paintPlayer(targetPlayer, npc);

        this.config.emitEvent('npc:paint', {
            npcId: npc.id,
            npcName: npc.player.name,
            targetId: targetPlayer.id,
            previewDataUrl: previewDataUrl,
            message: npc.player.name + ' 在你身上画了一笔'
        });
        this.recordNpcEvent('npc_paint', npc, safeState, {
            targetId: targetPlayer.id,
            color: npc.color,
            message: npc.player.name + ' 在你身上画了一笔'
        }, targetPlayer.id);
    }

    async tick(gameState, dt) {
        const safeState = gameState || {};
        const mapSize = {
            width: safeState.mapWidth || this.config.mapWidth,
            height: safeState.mapHeight || this.config.mapHeight
        };

        if (!this.npcs.length) {
            return [];
        }

        this.npcs.forEach((npc) => npc.move(dt, mapSize.width, mapSize.height));
        await this.handleRecentChats(safeState);

        const batchContext = this.buildBatchContext(this.npcs, safeState);
        const prompt = buildNpcIntentPrompt(this.npcs, batchContext);
        let parsedIntents = [];
        const now = Date.now();

        if (estimatePromptTokens(prompt) <= this.config.maxPromptTokens && this.consumeCallBudget(now)) {
            try {
                const result = await this.config.ask('npc_intent', {
                    npcs: batchContext
                }, {
                    timeoutMs: this.config.timeoutMs,
                    useCache: false,
                    prompt: prompt
                });

                if (result && result.ok) {
                    parsedIntents = this.parseIntents(result.text);
                }
            } catch (_error) {
                parsedIntents = [];
            }
        }

        const sideEffects = this.npcs.map((npc, index) => {
            const context = batchContext[index];
            const pendingChatIntent = this.pendingChatIntents[npc.id] || null;
            if (pendingChatIntent) {
                delete this.pendingChatIntents[npc.id];
            }
            const parsedIntent = this.resolveIntent(parsedIntents, npc, index, mapSize, safeState);
            const nextIntent = pendingChatIntent || parsedIntent || this.buildFallbackIntent(npc, safeState, mapSize, context);
            const intentSource = pendingChatIntent ? 'chat' : parsedIntent ? 'llm' : 'fallback';
            if (this.shouldRecordNpcIntent(npc, intentSource, now)) {
                this.recordNpcEvent('npc_intent', npc, safeState, {
                    type: nextIntent.type,
                    params: nextIntent.params || {},
                    reason: nextIntent.reason || '',
                    source: intentSource
                });
            }

            if (nextIntent.type === 'speak') {
                return this.handleNpcSpeak(npc, safeState, {
                    timeOfDay: context.time_of_day,
                    roundPhase: context.round_phase,
                    playerX: context.player.x,
                    playerY: context.player.y,
                    npcX: context.npc.x,
                    npcY: context.npc.y,
                    intentType: nextIntent.type,
                    npcColor: npc.color,
                    memory: context.memory
                }).then(() => {
                    const movementIntent = this.buildRoamIntent(npc, mapSize, safeState);
                    npc.applyIntent(movementIntent);
                    npc.move(dt, mapSize.width, mapSize.height);
                });
            }

            if (nextIntent.type === 'paint') {
                this.handleNpcPaint(npc, safeState);
                const movementIntent = this.buildRoamIntent(npc, mapSize, safeState);
                npc.applyIntent(movementIntent);
                npc.move(dt, mapSize.width, mapSize.height);
                return Promise.resolve();
            }

            npc.applyIntent(nextIntent);
            npc.move(dt, mapSize.width, mapSize.height);
            return Promise.resolve();
        });

        await Promise.all(sideEffects);

        safeState.npcs = this.npcs.map((npc) => npc.player);
        return this.npcs.map((npc) => npc.currentIntent);
    }
}

module.exports = Orchestrator;
module.exports.Orchestrator = Orchestrator;
