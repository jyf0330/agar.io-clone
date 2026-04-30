'use strict';

function distance(left, right) {
    return Math.hypot((left.x || 0) - (right.x || 0), (left.y || 0) - (right.y || 0));
}

function pickNearestFood(player, visibleFood) {
    const food = Array.isArray(visibleFood) ? visibleFood.slice() : [];
    if (!food.length) {
        return null;
    }
    return food.sort((left, right) => distance(player, left) - distance(player, right))[0];
}

function buildWanderTarget(player, game) {
    const width = game && game.width ? game.width : 5000;
    const height = game && game.height ? game.height : 5000;
    return {
        x: Math.max(0, Math.min(width, (player.x || width / 2) + 180)),
        y: Math.max(0, Math.min(height, (player.y || height / 2) + 80))
    };
}

function planBotActions(context) {
    const safeContext = context || {};
    const player = safeContext.player || {x: 0, y: 0, massTotal: 0};
    const strategy = safeContext.profile && safeContext.profile.strategy ? safeContext.profile.strategy : {};
    const target = pickNearestFood(player, safeContext.visibleFood) || buildWanderTarget(player, safeContext.game);
    const actions = [{
        type: 'moveTarget',
        target: {
            x: target.x,
            y: target.y
        }
    }];
    const massTotal = typeof player.massTotal === 'number' ? player.massTotal : 0;

    if (massTotal >= (strategy.ejectMassThreshold || Number.POSITIVE_INFINITY)) {
        actions.push({type: 'ejectMass'});
    }
    if (massTotal >= (strategy.splitMassThreshold || Number.POSITIVE_INFINITY)) {
        actions.push({type: 'split'});
    }

    return actions;
}

function applyBotActions(socket, actions) {
    if (!socket || typeof socket.emit !== 'function') {
        return;
    }

    (actions || []).forEach((action) => {
        if (!action || !action.type) {
            return;
        }
        if (action.type === 'moveTarget') {
            socket.emit('0', action.target);
        } else if (action.type === 'ejectMass') {
            socket.emit('1');
        } else if (action.type === 'split') {
            socket.emit('2');
        } else if (action.type === 'attemptConnection') {
            socket.emit('3');
        }
    });
}

module.exports = {
    planBotActions,
    applyBotActions
};
