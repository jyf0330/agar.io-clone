'use strict';

const wrapper = require('../llm/wrapper');
const {randomWalkIntent} = require('./fallback');
const {buildNpcIntentPrompt, buildNpcUtterPrompt} = require('./prompts');
const {buildContextualFallbackUtterance} = require('./greetings');

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
            ask: wrapper.ask,
            emitEvent: null,
            paintPlayer: null
        }, settings);
        this.npcs = [];
        this.callTimestamps = [];
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
                last_player_action: gameState && gameState.lastPlayerAction ? gameState.lastPlayerAction : 'idle'
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
            const parsedIntent = this.resolveIntent(parsedIntents, npc, index, mapSize, safeState);
            const nextIntent = parsedIntent || this.buildFallbackIntent(npc, safeState, mapSize, context);

            if (nextIntent.type === 'speak') {
                return this.handleNpcSpeak(npc, safeState, {
                    timeOfDay: context.time_of_day,
                    roundPhase: context.round_phase,
                    playerX: context.player.x,
                    playerY: context.player.y,
                    npcX: context.npc.x,
                    npcY: context.npc.y,
                    intentType: nextIntent.type,
                    npcColor: npc.color
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
