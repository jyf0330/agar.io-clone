'use strict';

const STATES = Object.freeze({
    IDLE: 'IDLE',
    CHANNELING: 'CHANNELING',
    RESONATING: 'RESONATING',
    BREAK: 'BREAK'
});

function createConnectionState() {
    return {
        connectionStatus: STATES.IDLE,
        connectionTargetId: null,
        connectionTargetName: null
    };
}

function applyConnectionState(target, overrides) {
    return Object.assign(target, createConnectionState(), overrides || {});
}

function clearConnectionState(target) {
    return applyConnectionState(target);
}

function distance(actor, target) {
    return Math.hypot(actor.x - target.x, actor.y - target.y);
}

function isEligibleConnectionTarget(actor, target, range) {
    if (!target || actor.id === target.id) {
        return false;
    }

    if (actor.connectionStatus !== STATES.IDLE || target.connectionStatus !== STATES.IDLE) {
        return false;
    }

    return distance(actor, target) <= range;
}

function selectTarget(actor, players, range) {
    const attemptRange = typeof range === 'number' ? range : 0;
    let target = null;
    let bestDistance = Infinity;

    for (const player of players) {
        if (!isEligibleConnectionTarget(actor, player, attemptRange)) {
            continue;
        }

        const currentDistance = distance(actor, player);
        if (currentDistance < bestDistance) {
            target = player;
            bestDistance = currentDistance;
        }
    }

    return target;
}

function createStatePatch(status, targetPlayer) {
    return {
        connectionStatus: status,
        connectionTargetId: targetPlayer ? targetPlayer.id : null,
        connectionTargetName: targetPlayer ? targetPlayer.name : null
    };
}

function planAttempt(actor, players, range) {
    if (!actor || actor.connectionStatus !== STATES.IDLE) {
        return {
            ignored: true,
            status: null,
            target: null,
            actorState: null,
            targetState: null
        };
    }

    const target = selectTarget(actor, players, range);
    if (!target) {
        return {
            ignored: false,
            status: STATES.BREAK,
            target: null,
            actorState: createStatePatch(STATES.BREAK, null),
            targetState: null
        };
    }

    return {
        ignored: false,
        status: STATES.CHANNELING,
        target: target,
        actorState: createStatePatch(STATES.CHANNELING, target),
        targetState: createStatePatch(STATES.CHANNELING, actor)
    };
}

function resolveOutcome(actor, target, range) {
    const attemptRange = typeof range === 'number' ? range : 0;
    return distance(actor, target) <= attemptRange ? STATES.RESONATING : STATES.BREAK;
}

module.exports = {
    STATES,
    createConnectionState,
    applyConnectionState,
    clearConnectionState,
    selectTarget,
    planAttempt,
    resolveOutcome,
    findConnectionTarget: selectTarget,
    resolveConnectionOutcome: resolveOutcome
};
