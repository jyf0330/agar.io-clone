"use strict";

const body = require('../body');

class GhostRecorder {
    constructor(options) {
        const settings = options || {};
        this.sessionId = settings.sessionId || String(Date.now());
        this.startedAt = settings.startedAt || Date.now();
        this.sampleIntervalMs = settings.sampleIntervalMs || 200;
        this.memoryStore = settings.memoryStore || null;
        this.lastTraceAtByPlayer = {};
    }

    getElapsed(now) {
        return Math.max(0, now - this.startedAt);
    }

    recordEvent(player, kind, payload, now) {
        if (!this.memoryStore || typeof this.memoryStore.recordEvent !== 'function' || !player) {
            return;
        }

        this.memoryStore.recordEvent({
            playerId: player.id,
            npcId: '',
            sessionId: this.sessionId,
            kind: kind,
            payload: Object.assign({
                sessionId: this.sessionId,
                ghostId: player.id,
                name: player.name || '',
                t: this.getElapsed(now || Date.now())
            }, payload || {}),
            ts: now || Date.now()
        });
    }

    recordPlayers(players, now) {
        (players || []).forEach((player) => {
            if (!player || player.isNpc) {
                return;
            }

            const lastTraceAt = this.lastTraceAtByPlayer[player.id] || 0;
            if (lastTraceAt && now - lastTraceAt < this.sampleIntervalMs) {
                return;
            }

            this.lastTraceAtByPlayer[player.id] = now;
            this.recordEvent(player, 'ghost_trace', {
                x: player.x,
                y: player.y,
                hue: player.hue,
                bodyParts: (player.bodyParts || []).map((part) => body.cloneBodyPart(part))
            }, now);
        });
    }

    recordChat(player, message, now) {
        this.recordEvent(player, 'ghost_chat', {
            x: player.x,
            y: player.y,
            chat: String(message || '').substring(0, 140)
        }, now);
    }

    recordItem(player, part, position, now) {
        this.recordEvent(player, 'ghost_item', {
            x: position.x,
            y: position.y,
            part: body.cloneBodyPart(part)
        }, now);
    }

    recordPartEvent(player, eventType, part, position, now, payload) {
        const eventPosition = position || {};
        this.recordEvent(player, eventType, Object.assign({
            x: eventPosition.x,
            y: eventPosition.y,
            part: body.cloneBodyPart(part)
        }, payload || {}), now);
    }
}

module.exports = GhostRecorder;
