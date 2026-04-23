'use strict';

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function randomWalkIntent(npc, mapSize) {
    const width = mapSize && mapSize.width ? mapSize.width : 5000;
    const height = mapSize && mapSize.height ? mapSize.height : 5000;
    const basePosition = npc && npc.position ? npc.position : { x: width / 2, y: height / 2 };
    const stride = Math.max(90, Math.min(width, height) * 0.08);
    const destinationX = clamp(
        basePosition.x + (Math.random() - 0.5) * stride * 2,
        0,
        width
    );
    const destinationY = clamp(
        basePosition.y + (Math.random() - 0.5) * stride * 2,
        0,
        height
    );

    return {
        type: 'move_to',
        params: {
            x: Math.round(destinationX),
            y: Math.round(destinationY)
        },
        reason: 'fallback-random-walk'
    };
}

module.exports = {
    randomWalkIntent: randomWalkIntent
};
