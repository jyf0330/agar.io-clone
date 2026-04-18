'use strict';

const path = require('path');
const connectionConfig = require(path.resolve(process.cwd(), 'configs/game/connection'));

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

function findConnectionTarget(actor, players, range) {
    const attemptRange = typeof range === 'number' ? range : connectionConfig.attemptRange;
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

function resolveConnectionOutcome(actor, target, range) {
    const attemptRange = typeof range === 'number' ? range : connectionConfig.attemptRange;
    return distance(actor, target) <= attemptRange ? STATES.RESONATING : STATES.BREAK;
}

module.exports = {
    STATES,
    config: connectionConfig,
    createConnectionState,
    applyConnectionState,
    clearConnectionState,
    findConnectionTarget,
    resolveConnectionOutcome
};
