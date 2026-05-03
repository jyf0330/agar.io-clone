'use strict';

const DEFAULT_EDGE_MARGIN = 420;
const DEFAULT_FOOD_CLUSTER_RADIUS = 140;
const DEFAULT_WANDER_MIN_DISTANCE = 360;
const DEFAULT_WANDER_MAX_DISTANCE = 1200;
const DEFAULT_WANDER_REACHED_DISTANCE = 140;
const DEFAULT_STUCK_MOVEMENT_THRESHOLD = 8;
const DEFAULT_STUCK_TICK_LIMIT = 6;
const DEFAULT_STUCK_WANDER_TICKS = 20;
const DEFAULT_HUMANIZED_MOVE_INPUT_MIN_DISTANCE = 180;

function distance(left, right) {
    return Math.hypot((left.x || 0) - (right.x || 0), (left.y || 0) - (right.y || 0));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getMass(entity) {
    if (!entity) {
        return 0;
    }
    if (typeof entity.massTotal === 'number') {
        return entity.massTotal;
    }
    if (typeof entity.mass === 'number') {
        return entity.mass;
    }
    return 0;
}

function getWorld(game) {
    return {
        width: game && game.width ? game.width : 5000,
        height: game && game.height ? game.height : 5000
    };
}

function getEdgeMargin(world, strategy) {
    const configured = Number(strategy.edgeMargin || strategy.edgeAvoidanceMargin);
    const requested = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_EDGE_MARGIN;
    return Math.min(requested, Math.floor(Math.min(world.width, world.height) / 3));
}

function getFoodMass(food) {
    if (!food) {
        return 1;
    }
    if (typeof food.massTotal === 'number') {
        return Math.max(1, food.massTotal);
    }
    if (typeof food.mass === 'number') {
        return Math.max(1, food.mass);
    }
    if (typeof food.size === 'number') {
        return Math.max(1, food.size);
    }
    return 1;
}

function clampTarget(target, world, margin) {
    return {
        x: Math.round(clamp(target.x, margin, world.width - margin)),
        y: Math.round(clamp(target.y, margin, world.height - margin))
    };
}

function isValidWanderTarget(target, world, margin) {
    return target
        && typeof target.x === 'number'
        && typeof target.y === 'number'
        && target.x >= margin
        && target.x <= world.width - margin
        && target.y >= margin
        && target.y <= world.height - margin;
}

function isNearEdge(player, world, margin) {
    return player.x <= margin
        || player.y <= margin
        || player.x >= world.width - margin
        || player.y >= world.height - margin;
}

function targetPullsInward(player, target, world, margin) {
    if (player.x <= margin && target.x <= player.x) {
        return false;
    }
    if (player.y <= margin && target.y <= player.y) {
        return false;
    }
    if (player.x >= world.width - margin && target.x >= player.x) {
        return false;
    }
    if (player.y >= world.height - margin && target.y >= player.y) {
        return false;
    }
    return true;
}

function needsEdgeRecovery(player, target, game, strategy) {
    if (!target) {
        return false;
    }
    const world = getWorld(game);
    const margin = getEdgeMargin(world, strategy);
    return isNearEdge(player, world, margin) && !targetPullsInward(player, target, world, margin);
}

function getHardEdgeMargin(world) {
    return Math.max(20, Math.min(80, Math.floor(Math.min(world.width, world.height) * 0.02)));
}

function isAtHardEdge(point, world) {
    const margin = getHardEdgeMargin(world);
    return point.x <= margin
        || point.y <= margin
        || point.x >= world.width - margin
        || point.y >= world.height - margin;
}

function buildHardEdgeEscapeTarget(player, threat, world) {
    const step = DEFAULT_EDGE_MARGIN;
    const candidates = [];

    if (player.x >= world.width - getHardEdgeMargin(world)) {
        candidates.push({x: player.x - step, y: player.y});
    }
    if (player.x <= getHardEdgeMargin(world)) {
        candidates.push({x: player.x + step, y: player.y});
    }
    if (player.y >= world.height - getHardEdgeMargin(world)) {
        candidates.push({x: player.x, y: player.y - step});
    }
    if (player.y <= getHardEdgeMargin(world)) {
        candidates.push({x: player.x, y: player.y + step});
    }
    if (candidates.length > 1) {
        candidates.push({
            x: candidates[0].x,
            y: candidates[1].y
        });
    }

    return candidates
        .map((candidate) => clampTarget(candidate, world, 0))
        .sort((left, right) => distance(right, threat) - distance(left, threat))[0]
        || clampTarget(player, world, 0);
}

function randomInRange(random, min, max) {
    return min + random() * Math.max(0, max - min);
}

function buildNewWanderTarget(player, world, strategy, random) {
    const margin = getEdgeMargin(world, strategy);
    const nearEdge = isNearEdge(player, world, margin);

    if (nearEdge) {
        return clampTarget({
            x: randomInRange(random, margin, world.width - margin),
            y: randomInRange(random, margin, world.height - margin)
        }, world, margin);
    }

    const minDistance = strategy.wanderMinDistance || DEFAULT_WANDER_MIN_DISTANCE;
    const maxDistance = Math.max(minDistance, strategy.wanderMaxDistance || DEFAULT_WANDER_MAX_DISTANCE);
    const angle = random() * Math.PI * 2;
    const radius = randomInRange(random, minDistance, maxDistance);

    return clampTarget({
        x: (player.x || world.width / 2) + Math.cos(angle) * radius,
        y: (player.y || world.height / 2) + Math.sin(angle) * radius
    }, world, margin);
}

function buildWanderTarget(player, game, strategy, random, memory) {
    const world = getWorld(game);
    const margin = getEdgeMargin(world, strategy);
    const reachedDistance = strategy.wanderReachedDistance || DEFAULT_WANDER_REACHED_DISTANCE;
    const state = memory || {};

    if (isValidWanderTarget(state.wanderTarget, world, margin)
        && distance(player, state.wanderTarget) > reachedDistance) {
        return state.wanderTarget;
    }

    const target = buildNewWanderTarget(player, world, strategy, random);
    if (memory) {
        memory.wanderTarget = target;
    }
    return target;
}

function updateStuckState(player, memory, strategy) {
    if (!memory || typeof player.x !== 'number' || typeof player.y !== 'number') {
        return false;
    }

    const threshold = typeof strategy.stuckMovementThreshold === 'number'
        ? strategy.stuckMovementThreshold
        : DEFAULT_STUCK_MOVEMENT_THRESHOLD;
    const tickLimit = typeof strategy.stuckTickLimit === 'number'
        ? strategy.stuckTickLimit
        : DEFAULT_STUCK_TICK_LIMIT;
    const previousPosition = memory.lastPosition;

    if (previousPosition && distance(player, previousPosition) <= threshold) {
        memory.stuckTicks = (memory.stuckTicks || 0) + 1;
    } else {
        memory.stuckTicks = 0;
    }

    memory.lastPosition = {
        x: player.x,
        y: player.y
    };

    if (memory.stuckTicks >= tickLimit) {
        memory.stuckTicks = 0;
        memory.wanderTarget = null;
        memory.forceWanderTicks = strategy.stuckWanderTicks || DEFAULT_STUCK_WANDER_TICKS;
        return true;
    }

    return false;
}

function consumeForcedWander(memory) {
    if (!memory || !(memory.forceWanderTicks > 0)) {
        return false;
    }

    memory.forceWanderTicks -= 1;
    return true;
}

function createFoodCluster(food) {
    const mass = getFoodMass(food);
    return {
        x: food.x,
        y: food.y,
        totalX: food.x * mass,
        totalY: food.y * mass,
        totalMass: mass,
        count: 1
    };
}

function addFoodToCluster(cluster, food) {
    const mass = getFoodMass(food);
    cluster.totalX += food.x * mass;
    cluster.totalY += food.y * mass;
    cluster.totalMass += mass;
    cluster.count += 1;
    cluster.x = cluster.totalX / cluster.totalMass;
    cluster.y = cluster.totalY / cluster.totalMass;
}

function clusterFood(visibleFood, strategy) {
    const food = Array.isArray(visibleFood) ? visibleFood.slice() : [];
    if (!food.length) {
        return [];
    }
    const clusterRadius = strategy.foodClusterRadius || DEFAULT_FOOD_CLUSTER_RADIUS;
    const clusters = [];

    food.forEach((entry) => {
        if (!entry || typeof entry.x !== 'number' || typeof entry.y !== 'number') {
            return;
        }
        const cluster = clusters.find((candidate) => distance(candidate, entry) <= clusterRadius);
        if (cluster) {
            addFoodToCluster(cluster, entry);
        } else {
            clusters.push(createFoodCluster(entry));
        }
    });

    return clusters;
}

function pickBestFoodTarget(player, visibleFood, strategy) {
    const clusters = clusterFood(visibleFood, strategy);
    if (!clusters.length) {
        return null;
    }

    return clusters
        .map((cluster) => {
            return Object.assign({}, cluster, {
                score: cluster.totalMass * 120 + cluster.count * 40 - distance(player, cluster)
            });
        })
        .sort((left, right) => right.score - left.score)[0];
}

function pickBestPartLootTarget(player, visiblePartLoot) {
    const parts = Array.isArray(visiblePartLoot) ? visiblePartLoot : [];
    return parts
        .filter((loot) => {
            return loot && typeof loot.x === 'number' && typeof loot.y === 'number';
        })
        .map((loot) => {
            return {
                x: Math.round(loot.x),
                y: Math.round(loot.y),
                distance: distance(player, loot)
            };
        })
        .sort((left, right) => left.distance - right.distance)[0] || null;
}

function pickNearbyThreat(player, visiblePlayers, strategy) {
    const players = Array.isArray(visiblePlayers) ? visiblePlayers : [];
    const playerMass = getMass(player);
    const caution = typeof strategy.caution === 'number' ? strategy.caution : 0.5;
    const dangerRadius = (strategy.dangerRadius || 420) * (0.75 + clamp(caution, 0, 1) * 0.5);
    const dangerMassRatio = strategy.dangerMassRatio || 1.25;

    return players
        .filter((other) => {
            return other
                && other !== player
                && distance(player, other) <= dangerRadius
                && getMass(other) >= playerMass * dangerMassRatio;
        })
        .sort((left, right) => distance(player, left) - distance(player, right))[0] || null;
}

function buildAvoidTarget(player, threat, game) {
    const world = getWorld(game);
    const dx = (player.x || 0) - (threat.x || 0);
    const dy = (player.y || 0) - (threat.y || 0);
    const length = Math.hypot(dx, dy) || 1;
    const escapeDistance = 420;
    const target = {
        x: Math.round(clamp((player.x || 0) + (dx / length) * escapeDistance, 0, world.width)),
        y: Math.round(clamp((player.y || 0) + (dy / length) * escapeDistance, 0, world.height))
    };

    if (isAtHardEdge(player, world) && isAtHardEdge(target, world)) {
        return buildHardEdgeEscapeTarget(player, threat, world);
    }

    return target;
}

function pickNearbyPrey(player, visiblePlayers, strategy, random) {
    const players = Array.isArray(visiblePlayers) ? visiblePlayers : [];
    if (!players.length) {
        return null;
    }
    const playerMass = getMass(player);
    const huntRadius = strategy.huntRadius || 520;
    const preyMassRatio = strategy.preyMassRatio || 0.55;
    const aggression = typeof strategy.aggression === 'number' ? strategy.aggression : 0.25;

    if (random() > aggression) {
        return null;
    }

    return players
        .filter((other) => {
            return other
                && other !== player
                && distance(player, other) <= huntRadius
                && getMass(other) > 0
                && getMass(other) <= playerMass * preyMassRatio;
        })
        .sort((left, right) => distance(player, left) - distance(player, right))[0] || null;
}

function shouldUseHumanizedSkill(strategy, random, chanceKey) {
    const chance = typeof strategy[chanceKey] === 'number' ? strategy[chanceKey] : 0.08;
    return random() <= chance;
}

function planBotActions(context) {
    const safeContext = context || {};
    const player = safeContext.player || {x: 0, y: 0, massTotal: 0};
    const profile = safeContext.profile || {};
    const strategy = profile.strategy || {};
    const random = typeof safeContext.random === 'function' ? safeContext.random : Math.random;
    const isHumanized = strategy.humanize === true;
    const memory = safeContext.memory || safeContext.botMemory || null;
    const isStuck = isHumanized ? updateStuckState(player, memory, strategy) : false;
    const forceWander = isStuck || (isHumanized && consumeForcedWander(memory));
    const threat = isHumanized ? pickNearbyThreat(player, safeContext.visiblePlayers, strategy) : null;
    const prey = isHumanized && !threat ? pickNearbyPrey(player, safeContext.visiblePlayers, strategy, random) : null;
    const partLootTarget = pickBestPartLootTarget(player, safeContext.visiblePartLoot);
    const foodTarget = pickBestFoodTarget(player, safeContext.visibleFood, strategy);
    let target = threat
        ? buildAvoidTarget(player, threat, safeContext.game)
        : (forceWander
            ? buildWanderTarget(player, safeContext.game, strategy, random, memory)
            : (prey || partLootTarget || foodTarget || buildWanderTarget(player, safeContext.game, strategy, random, memory)));

    if (isHumanized && !threat && needsEdgeRecovery(player, target, safeContext.game, strategy)) {
        target = buildWanderTarget(player, safeContext.game, strategy, random, memory);
    }
    const actions = [{
        type: 'moveTarget',
        target: {
            x: target.x,
            y: target.y
        }
    }];
    const massTotal = typeof player.massTotal === 'number' ? player.massTotal : 0;

    if (massTotal >= (strategy.ejectMassThreshold || Number.POSITIVE_INFINITY)
        && (!isHumanized || shouldUseHumanizedSkill(strategy, random, 'ejectMassChance'))) {
        actions.push({type: 'ejectMass'});
    }
    if (massTotal >= (strategy.splitMassThreshold || Number.POSITIVE_INFINITY)
        && (!isHumanized || shouldUseHumanizedSkill(strategy, random, 'splitChance'))) {
        actions.push({type: 'split'});
    }
    return actions;
}

function buildMoveInput(target, context) {
    const player = context && context.player;
    if (!target
        || typeof target.x !== 'number'
        || typeof target.y !== 'number'
        || !player
        || typeof player.x !== 'number'
        || typeof player.y !== 'number') {
        return target;
    }

    const input = {
        x: Math.round(target.x - player.x),
        y: Math.round(target.y - player.y)
    };
    const strategy = context && context.profile && context.profile.strategy ? context.profile.strategy : {};
    const minDistance = strategy.humanize === true
        ? (strategy.moveInputMinDistance || DEFAULT_HUMANIZED_MOVE_INPUT_MIN_DISTANCE)
        : 0;
    const inputDistance = Math.hypot(input.x, input.y);

    if (minDistance > 0 && inputDistance > 0 && inputDistance < minDistance) {
        return {
            x: Math.round((input.x / inputDistance) * minDistance),
            y: Math.round((input.y / inputDistance) * minDistance)
        };
    }

    return input;
}

function applyBotActions(socket, actions, context) {
    if (!socket || typeof socket.emit !== 'function') {
        return;
    }

    (actions || []).forEach((action) => {
        if (!action || !action.type) {
            return;
        }
        if (action.type === 'moveTarget') {
            socket.emit('0', buildMoveInput(action.target, context));
        } else if (action.type === 'ejectMass') {
            socket.emit('1');
        } else if (action.type === 'split') {
            socket.emit('2');
        } else if (action.type === 'attemptConnection') {
            socket.emit('3');
        } else if (action.type === 'chat') {
            socket.emit('playerChat', {
                sender: action.sender || 'Bot',
                message: action.message || ''
            });
        }
    });
}

module.exports = {
    planBotActions,
    applyBotActions
};
