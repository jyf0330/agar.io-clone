'use strict';

function canEmit(socket) {
    return Boolean(socket && socket.connected);
}

function emitIfReady(socket, eventName, payload) {
    if (!canEmit(socket)) {
        return false;
    }

    if (typeof payload === 'undefined') {
        socket.emit(eventName);
    } else {
        socket.emit(eventName, payload);
    }

    return true;
}

function normalizeTarget(target) {
    return {
        x: target && typeof target.x === 'number' ? target.x : 0,
        y: target && typeof target.y === 'number' ? target.y : 0
    };
}

function targetChanged(previousTarget, nextTarget) {
    return !previousTarget
        || previousTarget.x !== nextTarget.x
        || previousTarget.y !== nextTarget.y;
}

function createTargetSync(settings) {
    const options = settings || {};
    const minIntervalMs = typeof options.minIntervalMs === 'number' ? options.minIntervalMs : 50;
    const keepAliveMs = typeof options.keepAliveMs === 'number' ? options.keepAliveMs : 250;
    let lastSentAt = null;
    let lastTarget = null;

    function emitIfNeeded(socket, eventName, target, now) {
        if (!canEmit(socket)) {
            return false;
        }

        const timestamp = typeof now === 'number' ? now : Date.now();
        const nextTarget = normalizeTarget(target);
        const changed = targetChanged(lastTarget, nextTarget);
        if (lastSentAt !== null) {
            const elapsedMs = timestamp - lastSentAt;
            if (changed && elapsedMs < minIntervalMs) {
                return false;
            }
            if (!changed && elapsedMs < keepAliveMs) {
                return false;
            }
        }

        if (!emitIfReady(socket, eventName, nextTarget)) {
            return false;
        }

        lastSentAt = timestamp;
        lastTarget = nextTarget;
        return true;
    }

    return {
        emitIfNeeded: emitIfNeeded
    };
}

module.exports = {
    canEmit,
    createTargetSync,
    emitIfReady
};
