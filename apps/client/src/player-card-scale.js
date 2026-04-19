'use strict';

var SCALE_STEP = 1.2;
var MIN_SCALE = 0.2;
var MAX_SCALE = 5.0;

function clampScale(scale) {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
}

function getNextScale(currentScale, direction) {
    var nextScale;
    if (direction === 'in') {
        nextScale = currentScale * SCALE_STEP;
    } else if (direction === 'out') {
        nextScale = currentScale / SCALE_STEP;
    } else {
        nextScale = currentScale;
    }

    return clampScale(nextScale);
}

function canScaleIn(currentScale) {
    return currentScale < MAX_SCALE;
}

function canScaleOut(currentScale) {
    return currentScale > MIN_SCALE;
}

module.exports = {
    SCALE_STEP: SCALE_STEP,
    MIN_SCALE: MIN_SCALE,
    MAX_SCALE: MAX_SCALE,
    clampScale: clampScale,
    getNextScale: getNextScale,
    canScaleIn: canScaleIn,
    canScaleOut: canScaleOut
};
