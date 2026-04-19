'use strict';

function scaleObjectAroundPoint(object, ratio, centerX, centerY) {
    object.scaleX *= ratio;
    object.scaleY *= ratio;
    object.left = centerX + ((object.left || 0) - centerX) * ratio;
    object.top = centerY + ((object.top || 0) - centerY) * ratio;
}

function translateObject(object, deltaX, deltaY) {
    object.left = (object.left || 0) + deltaX;
    object.top = (object.top || 0) + deltaY;
}

function getKeyboardPanDelta(key, step) {
    var panStep = step || 12;

    switch (key) {
    case 'ArrowLeft':
        return { x: -panStep, y: 0 };
    case 'ArrowRight':
        return { x: panStep, y: 0 };
    case 'ArrowUp':
        return { x: 0, y: -panStep };
    case 'ArrowDown':
        return { x: 0, y: panStep };
    default:
        return null;
    }
}

module.exports = {
    scaleObjectAroundPoint: scaleObjectAroundPoint,
    translateObject: translateObject,
    getKeyboardPanDelta: getKeyboardPanDelta
};
