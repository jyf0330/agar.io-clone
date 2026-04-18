'use strict';

const path = require('path');
const bodyConfig = require(path.resolve(process.cwd(), 'configs/game/body'));

const TYPES = Object.freeze({
    HEAD: 'HEAD',
    HAND: 'HAND',
    FOOT: 'FOOT',
    MOUTH: 'MOUTH',
    HEART: 'HEART',
    SPIKE: 'SPIKE'
});

function getPartDefinition(type) {
    const definition = bodyConfig.partDefinitions[type];
    if (!definition) {
        throw new Error('Unknown body part type: ' + type);
    }

    return definition;
}

function createBodyPart(type, ordinal, overrides) {
    const definition = getPartDefinition(type);
    const index = typeof ordinal === 'number' ? ordinal : 1;

    return Object.assign({
        id: type.toLowerCase() + '-' + index,
        type: type,
        label: definition.label,
        mount: definition.mount,
        isCore: definition.isCore
    }, overrides || {});
}

function normalizeBodyParts(parts) {
    const typeCounts = {};

    return (parts || []).map((part) => {
        const type = part.type;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        return createBodyPart(type, typeCounts[type], part);
    });
}

function countBodyParts(parts) {
    const counts = {};
    Object.keys(bodyConfig.partDefinitions).forEach((type) => {
        counts[type] = 0;
    });

    (parts || []).forEach((part) => {
        counts[part.type] += 1;
    });

    return counts;
}

function createDefaultBodyParts() {
    return normalizeBodyParts(bodyConfig.defaultLoadout.map((type) => ({type: type})));
}

function createBodyState(parts) {
    const normalizedParts = normalizeBodyParts(parts || createDefaultBodyParts());

    return {
        bodyParts: normalizedParts,
        bodyPartCount: normalizedParts.length,
        bodyPartCounts: countBodyParts(normalizedParts),
        bodyBonuses: createBodyBonuses(normalizedParts)
    };
}

function applyBodyState(target, overrides) {
    const defaultState = createBodyState();
    const sourceParts = overrides && overrides.bodyParts ? overrides.bodyParts : defaultState.bodyParts;

    return Object.assign(target, defaultState, overrides || {}, createBodyState(sourceParts));
}

function getStealableParts(target) {
    return (target.bodyParts || []).filter((part) => part.isCore);
}

function getPartCount(target, type) {
    if (Array.isArray(target)) {
        return target.filter((part) => part.type === type).length;
    }

    if (target.bodyPartCounts && typeof target.bodyPartCounts[type] === 'number') {
        return target.bodyPartCounts[type];
    }

    return (target.bodyParts || []).filter((part) => part.type === type).length;
}

function createBodyBonuses(target) {
    return {
        movementSpeedMultiplier: getMovementSpeedMultiplier(target),
        connectionRangeBonus: getConnectionRangeBonus(target),
        visionRangeBonus: getVisionRangeBonus(target),
        resonanceIntimacyBonus: getResonanceIntimacyBonus(target),
        breakSpikeBonus: getBreakSpikeBonus(target),
        playerDevourMassMultiplier: getPlayerDevourMassMultiplier(target)
    };
}

function getMovementSpeedMultiplier(target) {
    const extraFeet = Math.max(0, getPartCount(target, TYPES.FOOT) - 1);
    return 1 + (extraFeet * bodyConfig.abilityModifiers.movementSpeedMultiplierPerExtraFoot);
}

function getConnectionRangeBonus(target) {
    const extraHands = Math.max(0, getPartCount(target, TYPES.HAND) - 1);
    return extraHands * bodyConfig.abilityModifiers.connectionRangePerExtraHand;
}

function getConnectionRange(baseRange, target) {
    return baseRange + getConnectionRangeBonus(target);
}

function getVisionRangeBonus(target) {
    const extraHeads = Math.max(0, getPartCount(target, TYPES.HEAD) - 1);
    return extraHeads * bodyConfig.abilityModifiers.visionRangePerExtraHead;
}

function getResonanceIntimacyBonus(target) {
    const extraHearts = Math.max(0, getPartCount(target, TYPES.HEART) - 1);
    return extraHearts * bodyConfig.abilityModifiers.resonanceIntimacyPerExtraHeart;
}

function getBreakSpikeBonus(target) {
    const extraSpikes = Math.max(0, getPartCount(target, TYPES.SPIKE) - 1);
    return extraSpikes * bodyConfig.abilityModifiers.breakSpikePerExtraSpike;
}

function getPlayerDevourMassGain(baseMass, target) {
    return baseMass * getPlayerDevourMassMultiplier(target);
}

function getPlayerDevourMassMultiplier(target) {
    const extraMouths = Math.max(0, getPartCount(target, TYPES.MOUTH) - 1);
    return 1 + (extraMouths * bodyConfig.abilityModifiers.playerDevourMassBonusPerExtraMouth);
}

function stealRandomCorePart(loser, eater, randomFn) {
    const stealable = getStealableParts(loser);
    if (stealable.length === 0) {
        return null;
    }

    const pickIndex = typeof randomFn === 'function'
        ? randomFn(stealable.length)
        : Math.floor(Math.random() * stealable.length);
    const selectedPart = stealable[pickIndex];
    const nextLoserParts = (loser.bodyParts || []).filter((part) => part !== selectedPart);
    const nextEaterParts = (eater.bodyParts || []).concat({
        type: selectedPart.type
    });

    applyBodyState(loser, {
        bodyParts: nextLoserParts
    });
    applyBodyState(eater, {
        bodyParts: nextEaterParts
    });

    return selectedPart;
}

module.exports = {
    TYPES,
    config: bodyConfig,
    createBodyPart,
    createDefaultBodyParts,
    createBodyState,
    applyBodyState,
    getStealableParts,
    getPartCount,
    createBodyBonuses,
    getMovementSpeedMultiplier,
    getConnectionRangeBonus,
    getConnectionRange,
    getVisionRangeBonus,
    getResonanceIntimacyBonus,
    getBreakSpikeBonus,
    getPlayerDevourMassGain,
    getPlayerDevourMassMultiplier,
    stealRandomCorePart
};
