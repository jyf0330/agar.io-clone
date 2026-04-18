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
        bodyPartCounts: countBodyParts(normalizedParts)
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
    if (target.bodyPartCounts && typeof target.bodyPartCounts[type] === 'number') {
        return target.bodyPartCounts[type];
    }

    return (target.bodyParts || []).filter((part) => part.type === type).length;
}

function getResonanceIntimacyBonus(target) {
    const extraHearts = Math.max(0, getPartCount(target, TYPES.HEART) - 1);
    return extraHearts * bodyConfig.abilityModifiers.resonanceIntimacyPerExtraHeart;
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
    getResonanceIntimacyBonus,
    stealRandomCorePart
};
