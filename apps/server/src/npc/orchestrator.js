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

class Orchestrator {
    constructor(config) {
        const settings = config || {};

        this.config = Object.assign({
            maxCallsPerSec: 5,
            timeoutMs: 4000,
            mapWidth: 5000,
            mapHeight: 5000,
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

    buildBatchContext(npcs, gameState) {
        const players = gameState && Array.isArray(gameState.players) ? gameState.players : [];
        const humanPlayers = players.filter((player) => !player.isNpc);
        const anchorPlayer = humanPlayers[0] || {
            x: this.config.mapWidth / 2,
            y: this.config.mapHeight / 2
        };
        const now = new Date();

        return npcs.map((npc) => {
            npc.syncFromPlayer();

            return {
                npcId: npc.id,
                npcName: npc.player.name,
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

    resolveIntent(parsedIntents, npc, index, mapSize) {
        const fromList = (parsedIntents || []).find((entry, entryIndex) => {
            return entry && (entry.npcId === npc.id || entry.id === npc.id || entryIndex === index);
        });
        const normalized = fromList || null;
        const intentType = normalized ? (normalized.intent || normalized.type) : null;
        if (normalized && ['move_to', 'idle', 'speak', 'paint'].indexOf(intentType) > -1) {
            return {
                type: intentType,
                params: normalized.params || {},
                reason: normalized.reason || ''
            };
        }

        return randomWalkIntent(npc, mapSize);
    }

    buildFallbackIntent(npc, safeState, mapSize, context) {
        const humanPlayers = (safeState.players || []).filter((player) => !player.isNpc);
        const now = Date.now();

        if (humanPlayers.length && now - npc.lastPaintTime > 26000) {
            return {
                type: 'paint',
                params: {
                    targetId: humanPlayers[0].id,
                    color: npc.color
                },
                reason: 'fallback-paint'
            };
        }

        if (now - npc.lastSpeakTime > 18000) {
            return {
                type: 'speak',
                params: {},
                reason: 'fallback-speak'
            };
        }

        if (npc.currentIntent && npc.currentIntent.type === 'move_to') {
            return npc.currentIntent;
        }

        return randomWalkIntent(npc, mapSize);
    }

    async generateUtterance(npc, context) {
        const prompt = buildNpcUtterPrompt(npc, context);

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

        const now = Date.now();
        this.pruneCallBudget(now);
        if (this.callTimestamps.length >= this.config.maxCallsPerSec) {
            return this.npcs.map((npc) => npc.currentIntent);
        }

        const batchContext = this.buildBatchContext(this.npcs, safeState);
        const prompt = buildNpcIntentPrompt(this.npcs, batchContext);
        let parsedIntents = [];

        this.callTimestamps.push(now);

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

        const sideEffects = this.npcs.map((npc, index) => {
            const context = batchContext[index];
            const parsedIntent = this.resolveIntent(parsedIntents, npc, index, mapSize);
            const nextIntent = parsedIntents.length ? parsedIntent : this.buildFallbackIntent(npc, safeState, mapSize, context);

            if (nextIntent.type === 'speak') {
                return this.handleNpcSpeak(npc, safeState, {
                    timeOfDay: context.time_of_day,
                    playerX: context.player.x,
                    playerY: context.player.y,
                    npcX: context.npc.x,
                    npcY: context.npc.y,
                    intentType: nextIntent.type,
                    npcColor: npc.color
                }).then(() => {
                    const movementIntent = randomWalkIntent(npc, mapSize);
                    npc.applyIntent(movementIntent);
                    npc.move(dt, mapSize.width, mapSize.height);
                });
            }

            if (nextIntent.type === 'paint') {
                this.handleNpcPaint(npc, safeState);
                const movementIntent = randomWalkIntent(npc, mapSize);
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
