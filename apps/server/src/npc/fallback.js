'use strict';

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function randomWalkIntent(npc, mapSize, options) {
    const width = mapSize && mapSize.width ? mapSize.width : 5000;
    const height = mapSize && mapSize.height ? mapSize.height : 5000;
    const settings = options || {};
    const profile = settings.profile || {};
    const basePosition = settings.basePosition || (npc && npc.position ? npc.position : { x: width / 2, y: height / 2 });
    const strideMultiplier = typeof profile.movementStrideMultiplier === 'number'
        ? profile.movementStrideMultiplier
        : 1;
    const edgePadding = typeof settings.edgePadding === 'number' ? settings.edgePadding : 60;
    const stride = Math.max(90, Math.min(width, height) * 0.08 * strideMultiplier);
    const destinationX = clamp(
        basePosition.x + (Math.random() - 0.5) * stride * 2,
        edgePadding,
        Math.max(edgePadding, width - edgePadding)
    );
    const destinationY = clamp(
        basePosition.y + (Math.random() - 0.5) * stride * 2,
        edgePadding,
        Math.max(edgePadding, height - edgePadding)
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
