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

function cloneBodyPart(part, overrides) {
    return Object.assign({}, part || {}, overrides || {});
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

function getSignatureType(signature) {
    return signature && (signature.slotType || signature.missingPart || signature.part || signature.type);
}

function getSignatureTemplateId(signature) {
    return signature && (signature.templateId || signature.selectedReferenceId || signature.referenceId);
}

function getSignatureTier(signature) {
    if (!signature || !signature.tier) {
        return 'none';
    }

    return signature.tier;
}

function getSignatureBonus(type, tier) {
    const bonusesByType = bodyConfig.signatureBonuses || {};
    const bonusesByTier = bonusesByType[type] || {};
    return Object.assign({}, bonusesByTier[tier] || bonusesByTier.none || {});
}

function createSignaturePart(signature, ordinal, basePart) {
    const type = getSignatureType(signature) || (basePart && basePart.type);
    const tier = getSignatureTier(signature);
    const usePlayerStroke = Boolean(signature && signature.imageDataUrl && !signature.skipped && tier !== 'none');

    return createBodyPart(type, ordinal, Object.assign({}, basePart || {}, {
        templateId: getSignatureTemplateId(signature),
        signatureTier: tier,
        signatureSimilarity: signature && typeof signature.similarity === 'number' ? signature.similarity : 0,
        signatureBonus: getSignatureBonus(type, tier),
        userStrokeDataUrl: usePlayerStroke ? signature.imageDataUrl : null,
        source: signature && signature.skipped ? 'signature-default' : 'signature-drawing'
    }));
}

function applySignatureToParts(parts, signature) {
    const type = getSignatureType(signature);
    if (!signature || !type) {
        return parts;
    }

    let replaced = false;
    let ordinal = 0;
    const nextParts = (parts || []).map((part) => {
        if (part.type === type) {
            ordinal += 1;
        }

        if (!replaced && part.type === type) {
            replaced = true;
            return createSignaturePart(signature, ordinal, part);
        }

        return part;
    });

    if (!replaced) {
        nextParts.push(createSignaturePart(signature, 1));
    }

    return nextParts;
}

function createBodyState(parts, signature) {
    const sourceParts = applySignatureToParts(parts || createDefaultBodyParts(), signature);
    const normalizedParts = normalizeBodyParts(sourceParts);

    return {
        bodyParts: normalizedParts,
        bodyPartCount: normalizedParts.length,
        bodyPartCounts: countBodyParts(normalizedParts),
        bodyBonuses: createBodyBonuses(normalizedParts)
    };
}

function createDroppedPart(part, position) {
    return cloneBodyPart(part, {
        x: position && typeof position.x === 'number' ? position.x : undefined,
        y: position && typeof position.y === 'number' ? position.y : undefined,
        droppedAt: Date.now()
    });
}

function equipBodyPart(target, incomingPart, dropPosition) {
    const existingParts = target.bodyParts || [];
    let droppedPart = null;
    let replaced = false;

    const nextParts = existingParts.map((part) => {
        if (!replaced && part.type === incomingPart.type) {
            droppedPart = createDroppedPart(part, dropPosition);
            replaced = true;
            return cloneBodyPart(incomingPart);
        }

        return part;
    });

    if (!replaced) {
        nextParts.push(cloneBodyPart(incomingPart));
    }

    applyBodyState(target, {
        bodyParts: nextParts,
        bodySignature: getSignatureType(target.bodySignature) === incomingPart.type ? null : target.bodySignature
    });

    return {
        equippedPart: cloneBodyPart(incomingPart),
        droppedPart: droppedPart
    };
}

function applyBodyState(target, overrides) {
    const defaultState = createBodyState();
    const sourceParts = overrides && overrides.bodyParts ? overrides.bodyParts : defaultState.bodyParts;
    const signature = overrides && Object.prototype.hasOwnProperty.call(overrides, 'bodySignature')
        ? overrides.bodySignature
        : target.bodySignature;

    return Object.assign(target, defaultState, overrides || {}, createBodyState(sourceParts, signature));
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
    const parts = Array.isArray(target) ? target : (target.bodyParts || []);
    const signatureBonus = parts.reduce((total, part) => {
        return total + ((part.signatureBonus && part.signatureBonus.connectionRangeBonus) || 0);
    }, 0);
    return (extraHands * bodyConfig.abilityModifiers.connectionRangePerExtraHand) + signatureBonus;
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
    const nextEaterParts = (eater.bodyParts || []).concat(cloneBodyPart(selectedPart));

    applyBodyState(loser, {
        bodyParts: nextLoserParts,
        bodySignature: getSignatureType(loser.bodySignature) === selectedPart.type ? null : loser.bodySignature
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
    cloneBodyPart,
    createSignaturePart,
    createDefaultBodyParts,
    createBodyState,
    applySignatureToParts,
    createDroppedPart,
    equipBodyPart,
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
