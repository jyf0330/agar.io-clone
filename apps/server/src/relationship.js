'use strict';

const path = require('path');
const relationshipConfig = require(path.resolve(process.cwd(), 'configs/game/relationship'));
const connection = require('./connection');
const body = require('./body');

function createRelationshipState() {
    return {
        intimacy: 0,
        spike: 0,
        pollution: 0
    };
}

function applyRelationshipState(target, overrides) {
    return Object.assign(target, createRelationshipState(), overrides || {});
}

function applyDelta(target, delta) {
    target.intimacy = Math.max(0, target.intimacy + delta.intimacy);
    target.spike = Math.max(0, target.spike + delta.spike);
    target.pollution = Math.max(0, target.pollution + delta.pollution);
}

function applyConnectionOutcome(actor, target, outcome) {
    const delta = outcome === connection.STATES.RESONATING
        ? relationshipConfig.resonatingDelta
        : relationshipConfig.breakDelta;

    const actorDelta = Object.assign({}, delta);
    const targetDelta = Object.assign({}, delta);

    if (outcome === connection.STATES.RESONATING) {
        actorDelta.intimacy += body.getResonanceIntimacyBonus(actor);
        targetDelta.intimacy += body.getResonanceIntimacyBonus(target);
    } else if (outcome === connection.STATES.BREAK) {
        actorDelta.spike += body.getBreakSpikeBonus(actor);
        targetDelta.spike += body.getBreakSpikeBonus(target);
    }

    applyDelta(actor, actorDelta);
    applyDelta(target, targetDelta);
}

module.exports = {
    createRelationshipState,
    applyRelationshipState,
    applyConnectionOutcome
};
