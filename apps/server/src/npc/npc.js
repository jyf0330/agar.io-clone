'use strict';

const {Player} = require('../map/player');

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function hexToHue(hex) {
    const normalized = String(hex || '#FF6B9D').replace('#', '');
    if (normalized.length !== 6) {
        return 330;
    }

    const red = parseInt(normalized.slice(0, 2), 16) / 255;
    const green = parseInt(normalized.slice(2, 4), 16) / 255;
    const blue = parseInt(normalized.slice(4, 6), 16) / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;

    if (!delta) {
        return 0;
    }

    let hue;
    if (max === red) {
        hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
        hue = (blue - red) / delta + 2;
    } else {
        hue = (red - green) / delta + 4;
    }

    return Math.round(hue * 60 < 0 ? hue * 60 + 360 : hue * 60);
}

function normalizeIntent(intent) {
    const safeIntent = intent || {};
    return {
        type: safeIntent.type || safeIntent.intent || 'idle',
        params: safeIntent.params || {},
        reason: safeIntent.reason || ''
    };
}

class NpcState {
    constructor(options) {
        const settings = options || {};
        const personality = settings.personality || {};
        const spawn = settings.spawn || { x: 0, y: 0 };

        this.id = settings.id || personality.id;
        this.personality = personality;
        this.color = settings.color || personality.color || '#FF6B9D';
        this.lastPaintTime = 0;
        this.lastSpeakTime = 0;
        this.currentIntent = {
            type: 'idle',
            params: {},
            reason: 'spawn'
        };
        this.facing = { x: 0, y: 1 };
        this.player = settings.player || new Player(settings.playerId || ('npc:' + this.id));
        this.player.init(spawn, settings.defaultPlayerMass || 10);
        this.player.isNpc = true;
        this.player.npcId = this.id;
        this.player.skeletonKey = personality.skeleton || settings.skeletonKey || null;
        this.player.name = settings.name || personality.name || this.id;
        this.player.hue = typeof settings.hue === 'number' ? settings.hue : hexToHue(this.color);
        this.player.playerCardPreviewDataUrl = settings.previewDataUrl || personality.previewDataUrl || null;
        this.player.target = this.player.target || { x: 0, y: 0 };
        this.player.lastHeartbeat = Date.now();
        this.position = {
            x: this.player.x,
            y: this.player.y
        };
    }

    syncFromPlayer() {
        this.position = {
            x: this.player.x,
            y: this.player.y
        };
        return this.position;
    }

    applyIntent(intent) {
        this.currentIntent = normalizeIntent(intent);
        return this.currentIntent;
    }

    move(_dt, mapWidth, mapHeight) {
        const width = mapWidth || 5000;
        const height = mapHeight || 5000;

        this.syncFromPlayer();

        if (this.currentIntent.type === 'move_to') {
            const targetX = clamp(this.currentIntent.params.x, 0, width);
            const targetY = clamp(this.currentIntent.params.y, 0, height);
            const vectorX = targetX - this.player.x;
            const vectorY = targetY - this.player.y;
            this.player.target = {
                x: vectorX,
                y: vectorY
            };
            if (vectorX || vectorY) {
                this.facing = {
                    x: vectorX,
                    y: vectorY
                };
            }
        } else {
            this.player.target = {
                x: 0,
                y: 0
            };
        }

        this.player.lastHeartbeat = Date.now();
        return this.player.target;
    }
}

module.exports = NpcState;
module.exports.NpcState = NpcState;
