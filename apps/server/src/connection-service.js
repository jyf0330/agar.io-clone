'use strict';

const path = require('path');
const connectionConfig = require(path.resolve(process.cwd(), 'configs/game/connection'));
const body = require('./body');
const connection = require('./connection');
const relationship = require('./relationship');

const DEFAULT_SCHEDULER = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
};

function createConnectionService(options) {
    const players = options && options.players;
    if (!players || typeof players.findByID !== 'function' || !Array.isArray(players.data)) {
        throw new Error('createConnectionService requires a player manager with data and findByID');
    }

    const scheduler = (options && options.scheduler) || DEFAULT_SCHEDULER;
    const relationshipModule = (options && options.relationship) || relationship;
    const timers = {};

    function clearTimer(playerId) {
        if (timers[playerId]) {
            scheduler.clearTimeout(timers[playerId]);
            delete timers[playerId];
        }
    }

    function scheduleReset(player, delayMs) {
        clearTimer(player.id);
        timers[player.id] = scheduler.setTimeout(() => {
            connection.clearConnectionState(player);
            delete timers[player.id];
        }, delayMs);
    }

    function applyPairState(sourcePlayer, targetPlayer, status) {
        connection.applyConnectionState(sourcePlayer, {
            connectionStatus: status,
            connectionTargetId: targetPlayer ? targetPlayer.id : null,
            connectionTargetName: targetPlayer ? targetPlayer.name : null
        });
    }

    function attemptConnection(actor) {
        const currentPlayer = actor && players.findByID(actor.id);
        if (!currentPlayer) {
            return null;
        }

        const attemptRange = body.getConnectionRange(connectionConfig.attemptRange, currentPlayer);
        const plan = connection.planAttempt(currentPlayer, players.data, attemptRange);
        if (plan.ignored) {
            return null;
        }

        if (!plan.target) {
            connection.applyConnectionState(currentPlayer, plan.actorState);
            scheduleReset(currentPlayer, connectionConfig.breakDurationMs);
            return plan.status;
        }

        const targetPlayer = players.findByID(plan.target.id);
        if (!targetPlayer) {
            connection.applyConnectionState(currentPlayer, {
                connectionStatus: connection.STATES.BREAK
            });
            scheduleReset(currentPlayer, connectionConfig.breakDurationMs);
            return connection.STATES.BREAK;
        }

        connection.applyConnectionState(currentPlayer, plan.actorState);
        connection.applyConnectionState(targetPlayer, plan.targetState);

        scheduleReset(currentPlayer, connectionConfig.channelDurationMs + connectionConfig.resonanceDurationMs);
        scheduleReset(targetPlayer, connectionConfig.channelDurationMs + connectionConfig.resonanceDurationMs);

        scheduler.setTimeout(() => {
            const latestActor = players.findByID(currentPlayer.id);
            const latestTarget = players.findByID(targetPlayer.id);
            if (!latestActor || !latestTarget) {
                return;
            }

            if (latestActor.connectionTargetId !== latestTarget.id || latestTarget.connectionTargetId !== latestActor.id) {
                return;
            }

            const outcome = connection.resolveOutcome(latestActor, latestTarget, attemptRange);
            applyPairState(latestActor, latestTarget, outcome);
            applyPairState(latestTarget, latestActor, outcome);
            relationshipModule.applyConnectionOutcome(latestActor, latestTarget, outcome);

            if (outcome === connection.STATES.BREAK) {
                scheduleReset(latestActor, connectionConfig.breakDurationMs);
                scheduleReset(latestTarget, connectionConfig.breakDurationMs);
            } else {
                scheduleReset(latestActor, connectionConfig.resonanceDurationMs);
                scheduleReset(latestTarget, connectionConfig.resonanceDurationMs);
            }
        }, connectionConfig.channelDurationMs);

        return plan.status;
    }

    return {
        attemptConnection,
        clearTimer
    };
}

module.exports = createConnectionService;
module.exports.createConnectionService = createConnectionService;
