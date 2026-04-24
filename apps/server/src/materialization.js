'use strict';

const path = require('path');
const materializationConfig = require(path.resolve(process.cwd(), 'configs/game/materialization'));

const STAGES = Object.freeze({
    HOLLOW: 'HOLLOW',
    PARTIAL: 'PARTIAL',
    REAL: 'REAL',
    OVERREAL: 'OVERREAL'
});

const DEFAULT_MATERIALIZATION = materializationConfig.defaultMaterialization;

function resolveMaterializationStage(materialization) {
    const value = Number(materialization);
    const thresholds = materializationConfig.stageThresholds;

    if (value <= thresholds.HOLLOW.max) {
        return STAGES.HOLLOW;
    }
    if (value <= thresholds.PARTIAL.max) {
        return STAGES.PARTIAL;
    }
    if (value <= thresholds.REAL.max) {
        return STAGES.REAL;
    }
    return STAGES.OVERREAL;
}

function createMaterializationState(materialization = DEFAULT_MATERIALIZATION) {
    return {
        materialization,
        materializationStage: resolveMaterializationStage(materialization)
    };
}

function resolveMaterializationFromBodyParts(parts) {
    const count = Array.isArray(parts) ? parts.filter(Boolean).length : 0;
    const valuePerPart = typeof materializationConfig.valuePerBodyPart === 'number'
        ? materializationConfig.valuePerBodyPart
        : 0;

    return Math.max(0, Math.min(100, count * valuePerPart));
}

function applyMaterializationState(target, materialization = DEFAULT_MATERIALIZATION) {
    return Object.assign(target, createMaterializationState(materialization));
}

module.exports = {
    STAGES,
    DEFAULT_MATERIALIZATION,
    resolveMaterializationStage,
    resolveMaterializationFromBodyParts,
    createMaterializationState,
    applyMaterializationState
};
