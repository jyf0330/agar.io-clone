'use strict';

const path = require('path');
const bodyConfig = require(path.resolve(process.cwd(), 'configs/game/body'));
const materialization = require('./materialization');

const TYPES = Object.freeze({
    HEAD: 'HEAD',
    HAND: 'HAND',
    FOOT: 'FOOT',
    MOUTH: 'MOUTH',
    HEART: 'HEART',
    SPIKE: 'SPIKE'
});

const EQUIPMENT_SLOT_KEYS = Object.freeze([
    'head',
    'torso',
    'leftHand',
    'rightHand',
    'leftLeg',
    'rightLeg'
]);

function getPartDefinition(type) {
    const definition = bodyConfig.partDefinitions[type];
    if (!definition) {
        throw new Error('Unknown body part type: ' + type);
    }

    return definition;
}

function getPartType(partOrType) {
    if (typeof partOrType === 'string') {
        return partOrType;
    }

    return partOrType && (partOrType.partType || partOrType.type);
}

function inferSourceType(source) {
    if (source === 'npc-task') {
        return 'npc_reward';
    }
    if (source === 'ghost-echo') {
        return 'ghost_echo';
    }
    if (source === 'signature-drawing' || source === 'signature-default') {
        return 'self_created';
    }
    if (source === 'slot-replacement' || source === 'world') {
        return 'map_pickup';
    }

    return source || 'self_created';
}

function cloneShallowObject(value) {
    return Object.assign({}, value || {});
}

function cloneHistoryChain(historyChain) {
    return (historyChain || []).map((entry) => Object.assign({}, entry));
}

function createHistoryEntry(eventType, data) {
    const payload = data || {};
    return {
        eventType: eventType,
        eventId: payload.eventId || payload.sourceEventId || null,
        playerId: payload.playerId || null,
        playerName: payload.playerName || null,
        fromPlayerId: payload.fromPlayerId || null,
        toPlayerId: payload.toPlayerId || null,
        sourceType: payload.sourceType || null,
        x: typeof payload.x === 'number' ? payload.x : null,
        y: typeof payload.y === 'number' ? payload.y : null,
        at: payload.at || null
    };
}

function appendPartHistory(part, eventType, data) {
    const nextPart = cloneBodyPart(part);
    nextPart.historyChain = cloneHistoryChain(nextPart.historyChain);
    nextPart.historyChain.push(createHistoryEntry(eventType, data));
    return nextPart;
}

function resolveEquipmentSlot(type, ordinal, overrides) {
    const source = overrides || {};
    if (source.slotId || source.equipmentSlot) {
        return source.slotId || source.equipmentSlot;
    }

    if (type === TYPES.HEAD) {
        return 'head';
    }
    if (type === TYPES.HAND) {
        return ordinal > 1 ? 'leftHand' : 'rightHand';
    }
    if (type === TYPES.FOOT) {
        return ordinal > 1 ? 'leftLeg' : 'rightLeg';
    }
    if (type === TYPES.MOUTH || type === TYPES.HEART) {
        return 'torso';
    }

    return null;
}

function createEmptyEquipmentSlots() {
    return EQUIPMENT_SLOT_KEYS.reduce((slots, key) => {
        slots[key] = null;
        return slots;
    }, {});
}

function createEquipmentSlots(parts) {
    const slots = createEmptyEquipmentSlots();

    (parts || []).forEach((part) => {
        const slotId = part && (part.slotId || part.equipmentSlot);
        if (!Object.prototype.hasOwnProperty.call(slots, slotId) || slots[slotId]) {
            return;
        }

        slots[slotId] = cloneBodyPart(part);
    });

    return slots;
}

function createBodyPart(type, ordinal, overrides) {
    const source = overrides || {};
    const normalizedType = getPartType(type) || getPartType(source);
    const definition = getPartDefinition(normalizedType);
    const index = typeof ordinal === 'number' ? ordinal : 1;
    const partId = source.partId || source.id || normalizedType.toLowerCase() + '-' + index;
    const sourceType = source.sourceType || inferSourceType(source.source);
    const slotId = resolveEquipmentSlot(normalizedType, index, source);
    const historyChain = source.historyChain
        ? cloneHistoryChain(source.historyChain)
        : [createHistoryEntry('created', {
            sourceEventId: source.sourceEventId,
            playerId: source.originPlayerId || source.currentOwnerId,
            playerName: source.originPlayerName,
            sourceType: sourceType
        })];

    return Object.assign({
        id: partId,
        partId: partId,
        type: normalizedType,
        partType: normalizedType,
        label: definition.label,
        displayName: definition.label,
        mount: definition.mount,
        isCore: definition.isCore,
        slotId: slotId,
        equipmentSlot: slotId,
        templateId: source.templateId || null,
        stats: cloneShallowObject(source.stats),
        appearanceRef: source.appearanceRef || source.templateId || null,
        imageData: source.imageData || null,
        drawingDataRef: source.drawingDataRef || source.userStrokeDataUrl || null,
        originPlayerId: source.originPlayerId || null,
        originPlayerName: source.originPlayerName || null,
        currentOwnerId: Object.prototype.hasOwnProperty.call(source, 'currentOwnerId') ? source.currentOwnerId : null,
        sourceType: sourceType,
        source: source.source || sourceType,
        sourceEventId: source.sourceEventId || null,
        historyChain: historyChain
    }, source, {
        id: partId,
        partId: partId,
        type: normalizedType,
        partType: normalizedType,
        slotId: slotId,
        equipmentSlot: slotId,
        displayName: source.displayName || source.label || definition.label,
        stats: cloneShallowObject(source.stats),
        historyChain: historyChain
    });
}

function cloneBodyPart(part, overrides) {
    const cloned = Object.assign({}, part || {}, overrides || {});
    cloned.stats = cloneShallowObject(cloned.stats);
    cloned.signatureBonus = cloneShallowObject(cloned.signatureBonus);
    cloned.historyChain = cloneHistoryChain(cloned.historyChain);
    return cloned;
}

function normalizeBodyParts(parts) {
    const typeCounts = {};

    return (parts || []).map((part) => {
        const type = getPartType(part);
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
        counts[getPartType(part)] += 1;
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
        drawingDataRef: usePlayerStroke ? signature.imageDataUrl : null,
        source: signature && signature.skipped ? 'signature-default' : 'signature-drawing',
        sourceType: 'self_created'
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
        equipmentSlots: createEquipmentSlots(normalizedParts),
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
    const incomingType = getPartType(incomingPart);
    const equippedIncomingPart = appendPartHistory(createBodyPart(incomingType, 1, incomingPart), 'equipped', {
        playerId: target.id || null,
        playerName: target.name || null,
        sourceType: incomingPart && incomingPart.sourceType
    });
    equippedIncomingPart.currentOwnerId = target.id || null;
    let droppedPart = null;
    let replaced = false;

    const nextParts = existingParts.map((part) => {
        if (!replaced && getPartType(part) === incomingType) {
            droppedPart = appendPartHistory(createDroppedPart(part, dropPosition), 'replaced', {
                playerId: target.id || null,
                playerName: target.name || null,
                sourceType: part.sourceType
            });
            droppedPart = appendPartHistory(droppedPart, 'dropped', {
                playerId: target.id || null,
                playerName: target.name || null,
                x: dropPosition && dropPosition.x,
                y: dropPosition && dropPosition.y,
                sourceType: part.sourceType
            });
            droppedPart.currentOwnerId = null;
            replaced = true;
            return cloneBodyPart(equippedIncomingPart);
        }

        return part;
    });

    if (!replaced) {
        nextParts.push(cloneBodyPart(equippedIncomingPart));
    }

    applyBodyState(target, {
        bodyParts: nextParts,
        bodySignature: getSignatureType(target.bodySignature) === incomingType ? null : target.bodySignature
    });

    return {
        equippedPart: cloneBodyPart(equippedIncomingPart),
        droppedPart: droppedPart
    };
}

function applyBodyState(target, overrides) {
    const defaultState = createBodyState();
    const sourceParts = overrides && overrides.bodyParts ? overrides.bodyParts : defaultState.bodyParts;
    const signature = overrides && Object.prototype.hasOwnProperty.call(overrides, 'bodySignature')
        ? overrides.bodySignature
        : target.bodySignature;
    const bodyState = createBodyState(sourceParts, signature);
    const materializationState = materialization.createMaterializationState(
        materialization.resolveMaterializationFromBodyParts(bodyState.bodyParts)
    );

    return Object.assign(target, defaultState, overrides || {}, bodyState, materializationState);
}

function getStealableParts(target) {
    return (target.bodyParts || []).filter((part) => part.isCore);
}

function getPartCount(target, type) {
    if (Array.isArray(target)) {
        return target.filter((part) => getPartType(part) === type).length;
    }

    if (target.bodyPartCounts && typeof target.bodyPartCounts[type] === 'number') {
        return target.bodyPartCounts[type];
    }

    return (target.bodyParts || []).filter((part) => getPartType(part) === type).length;
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
    let stolenPart = appendPartHistory(selectedPart, 'stolen', {
        fromPlayerId: loser.id || null,
        playerId: loser.id || null,
        playerName: loser.name || null,
        toPlayerId: eater.id || null,
        sourceType: 'kill_loot'
    });
    stolenPart = appendPartHistory(stolenPart, 'equipped', {
        playerId: eater.id || null,
        playerName: eater.name || null,
        fromPlayerId: loser.id || null,
        sourceType: 'kill_loot'
    });
    stolenPart.currentOwnerId = eater.id || null;
    stolenPart.sourceType = 'kill_loot';
    const nextEaterParts = (eater.bodyParts || []).concat(cloneBodyPart(stolenPart));

    applyBodyState(loser, {
        bodyParts: nextLoserParts,
        bodySignature: getSignatureType(loser.bodySignature) === selectedPart.type ? null : loser.bodySignature
    });
    applyBodyState(eater, {
        bodyParts: nextEaterParts
    });

    return stolenPart;
}

module.exports = {
    TYPES,
    EQUIPMENT_SLOT_KEYS,
    config: bodyConfig,
    appendPartHistory,
    createEquipmentSlots,
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
