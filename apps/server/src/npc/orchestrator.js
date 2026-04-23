'use strict';

const wrapper = require('../llm/wrapper');
const {randomWalkIntent} = require('./fallback');
const {buildNpcIntentPrompt} = require('./prompts');

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
            ask: wrapper.ask
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
        if (normalized && (normalized.intent === 'move_to' || normalized.type === 'move_to' || normalized.intent === 'idle' || normalized.type === 'idle')) {
            return {
                type: normalized.intent || normalized.type,
                params: normalized.params || {},
                reason: normalized.reason || ''
            };
        }

        if (npc.currentIntent && npc.currentIntent.type === 'move_to') {
            return npc.currentIntent;
        }

        // TODO: Day 4 unlocks speak/paint; Day 3 keeps movement-only behavior for demo stability.
        return randomWalkIntent(npc, mapSize);
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

        this.npcs.forEach((npc, index) => {
            const nextIntent = this.resolveIntent(parsedIntents, npc, index, mapSize);
            npc.applyIntent(nextIntent);
            npc.move(dt, mapSize.width, mapSize.height);
        });

        safeState.npcs = this.npcs.map((npc) => npc.player);
        return this.npcs.map((npc) => npc.currentIntent);
    }
}

module.exports = Orchestrator;
module.exports.Orchestrator = Orchestrator;
