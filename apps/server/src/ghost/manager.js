"use strict";

function distance(left, right) {
    return Math.hypot(left.x - right.x, left.y - right.y);
}

function normalizeEvent(event) {
    const payload = event.payload || {};
    return Object.assign({}, payload, event, {
        kind: event.kind,
        sessionId: event.sessionId || payload.sessionId || 'seed-session',
        ghostId: event.ghostId || payload.ghostId || event.playerId || payload.playerId || 'ghost',
        t: typeof event.t === 'number' ? event.t : (typeof payload.t === 'number' ? payload.t : 0),
        x: typeof event.x === 'number' ? event.x : payload.x,
        y: typeof event.y === 'number' ? event.y : payload.y,
        name: event.name || payload.name || 'Echo'
    });
}

function normalizeAnchor(anchor) {
    return {
        id: anchor.anchorId || anchor.id,
        kind: 'trace',
        sessionId: anchor.sourceSessionId || 'seed-session',
        ghostId: anchor.sourcePlayerId || 'ghost',
        t: typeof anchor.t === 'number' ? anchor.t : 0,
        x: anchor.x,
        y: anchor.y,
        name: anchor.name || '历史回响',
        anchorEventType: anchor.eventType || 'anchor',
        priority: anchor.priority || 0
    };
}

function interpolateTrace(points, t) {
    if (!points || !points.length) {
        return null;
    }
    if (t <= points[0].t) {
        return points[0];
    }

    for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1];
        const next = points[index];
        if (t <= next.t) {
            const duration = Math.max(1, next.t - previous.t);
            const ratio = Math.max(0, Math.min(1, (t - previous.t) / duration));
            return {
                x: previous.x + ((next.x - previous.x) * ratio),
                y: previous.y + ((next.y - previous.y) * ratio),
                t: t
            };
        }
    }

    return points[points.length - 1];
}

class GhostManager {
    constructor(options) {
        const settings = options || {};
        this.triggerRadius = settings.triggerRadius || 800;
        this.triggerWindowMs = settings.timeWindowMs || settings.triggerWindowMs || 1200;
        this.followTimeoutMs = settings.followTimeoutMs || 30000;
        this.maxActiveGhosts = typeof settings.maxActiveGhosts === 'number' ? settings.maxActiveGhosts : 3;
        this.anchorCooldownMs = typeof settings.anchorCooldownMs === 'number' ? settings.anchorCooldownMs : 60000;
        this.chatBubbleDurationMs = typeof settings.chatBubbleDurationMs === 'number' ? settings.chatBubbleDurationMs : 4000;
        this.seedEvents = (settings.seedEvents || []).map(normalizeEvent);
        this.memoryStore = settings.memoryStore || null;
        this.spawnedItemIds = {};
        this.activeGhosts = {};
        this.anchorTriggeredAt = {};
    }

    getEvents() {
        if (!this.memoryStore) {
            return this.seedEvents;
        }

        const anchors = typeof this.memoryStore.listGhostAnchors === 'function'
            ? this.memoryStore.listGhostAnchors({limit: 1000}).map(normalizeAnchor)
            : [];
        const recorded = typeof this.memoryStore.listEvents === 'function'
            ? []
                .concat(this.memoryStore.listEvents({kind: 'ghost_trace', limit: 1000}))
                .concat(this.memoryStore.listEvents({kind: 'ghost_chat', limit: 1000}))
                .concat(this.memoryStore.listEvents({kind: 'ghost_item', limit: 1000}))
                .map((event) => normalizeEvent(Object.assign({}, event.payload || {}, {
                    id: event.id,
                    kind: event.kind.replace('ghost_', ''),
                    sessionId: event.sessionId,
                    playerId: event.playerId
                })))
            : [];

        return this.seedEvents.concat(anchors).concat(recorded);
    }

    isNearAnyPlayer(event, players) {
        return (players || []).some((player) => {
            if (player.isNpc) {
                return false;
            }
            return distance(player, event) <= this.triggerRadius;
        });
    }

    isInTimeWindow(event, elapsedMs) {
        return Math.abs(elapsedMs - event.t) <= this.triggerWindowMs;
    }

    getEventKey(event) {
        return event.id || [event.sessionId, event.ghostId, event.kind, event.t, event.x, event.y].join(':');
    }

    isAnchorCoolingDown(event, now) {
        const key = this.getEventKey(event);
        return this.anchorTriggeredAt[key] && now - this.anchorTriggeredAt[key] < this.anchorCooldownMs;
    }

    markAnchorTriggered(event, now) {
        this.anchorTriggeredAt[this.getEventKey(event)] = now;
    }

    getActiveGhostCount() {
        return Object.keys(this.activeGhosts).length;
    }

    canActivateTrace(event) {
        const key = event.sessionId + ':' + event.ghostId;
        return this.activeGhosts[key] || this.getActiveGhostCount() < this.maxActiveGhosts;
    }

    loadTracePoints(event) {
        if (!this.memoryStore || typeof this.memoryStore.listPlayerTraces !== 'function') {
            return [];
        }

        return this.memoryStore.listPlayerTraces({
            sessionId: event.sessionId,
            playerId: event.ghostId,
            limit: 1000
        })
            .filter((point) => typeof point.x === 'number' && typeof point.y === 'number' && typeof point.t === 'number')
            .sort((left, right) => left.t - right.t);
    }

    loadChatRecords(event) {
        if (!this.memoryStore || typeof this.memoryStore.listChatRecords !== 'function') {
            return [];
        }

        return this.memoryStore.listChatRecords({
            sessionId: event.sessionId,
            playerId: event.ghostId,
            limit: 500
        })
            .filter((chat) => chat.replayAllowed !== false && chat.text && typeof chat.t === 'number')
            .sort((left, right) => left.t - right.t);
    }

    activateTrace(event, now) {
        const key = event.sessionId + ':' + event.ghostId;
        this.activeGhosts[key] = {
            id: key,
            sessionId: event.sessionId,
            ghostId: event.ghostId,
            name: event.name,
            x: event.x,
            y: event.y,
            chat: event.chat || '',
            lastSeenAt: now,
            activatedAt: now,
            anchorT: event.t,
            tracePoints: this.loadTracePoints(event),
            chatRecords: this.loadChatRecords(event),
            radius: 34,
            isGhost: true
        };
    }

    spawnHistoricalItem(map, event) {
        const itemKey = event.id || [event.sessionId, event.ghostId, event.t, event.x, event.y].join(':');
        if (this.spawnedItemIds[itemKey] || !event.part || !map.partLoot) {
            return;
        }

        map.partLoot.addPart(Object.assign({}, event.part, {
            source: event.part.source || 'ghost-echo',
            historicalSessionId: event.sessionId,
            historicalGhostId: event.ghostId
        }), {
            x: event.x,
            y: event.y
        }, 'ghost-echo');
        this.spawnedItemIds[itemKey] = true;
    }

    pruneGhosts(now) {
        Object.keys(this.activeGhosts).forEach((key) => {
            if (now - this.activeGhosts[key].lastSeenAt > this.followTimeoutMs) {
                delete this.activeGhosts[key];
            }
        });
    }

    updateGhostPositions(now) {
        Object.keys(this.activeGhosts).forEach((key) => {
            const ghost = this.activeGhosts[key];
            const replayT = ghost.anchorT + Math.max(0, now - ghost.activatedAt);
            const point = interpolateTrace(ghost.tracePoints, replayT);
            if (point) {
                ghost.x = point.x;
                ghost.y = point.y;
            }
        });
    }

    updateGhostChats(now) {
        Object.keys(this.activeGhosts).forEach((key) => {
            const ghost = this.activeGhosts[key];
            const replayT = ghost.anchorT + Math.max(0, now - ghost.activatedAt);
            const chat = (ghost.chatRecords || []).filter((record) => {
                return record.t <= replayT && replayT - record.t <= this.chatBubbleDurationMs;
            }).pop();

            ghost.chat = chat ? chat.text : '';
        });
    }

    tick(state) {
        const safeState = state || {};
        const map = safeState.map;
        const players = safeState.players || [];
        const now = safeState.now || Date.now();
        const startedAt = safeState.matchStartedAt || now;
        const elapsedMs = Math.max(0, now - startedAt);

        this.pruneGhosts(now);
        this.updateGhostPositions(now);
        this.updateGhostChats(now);
        this.getEvents().forEach((event) => {
            if (
                !this.isInTimeWindow(event, elapsedMs)
                || !this.isNearAnyPlayer(event, players)
                || this.isAnchorCoolingDown(event, now)
            ) {
                return;
            }

            if (event.kind === 'trace') {
                if (!this.canActivateTrace(event)) {
                    this.markAnchorTriggered(event, now);
                    return;
                }
                this.activateTrace(event, now);
                this.markAnchorTriggered(event, now);
            }
            if (event.kind === 'item') {
                this.spawnHistoricalItem(map, event);
                this.markAnchorTriggered(event, now);
            }
        });

        if (map) {
            map.ghosts = Object.keys(this.activeGhosts).map((key) => this.activeGhosts[key]);
        }
    }
}

module.exports = GhostManager;
