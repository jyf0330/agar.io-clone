'use strict';

const socketIoClient = require('socket.io-client');
const {applyBotActions, planBotActions} = require('./bot-actions');

const DEFAULT_SERVER_URL = 'http://127.0.0.1:3000';
const DEFAULT_PROFILE = {
    name: 'Bot_One',
    screenWidth: 1280,
    screenHeight: 720,
    consentToRecord: true,
    isReplayAllowed: true
};
const DEFAULT_BEHAVIOR_LOG_EVERY_TICKS = 10;

function buildEntryPayload(profile) {
    return Object.assign({}, DEFAULT_PROFILE, profile || {}, {
        isBot: true,
        consentToRecord: profile && profile.consentToRecord === false ? false : true,
        isReplayAllowed: profile && profile.isReplayAllowed === false ? false : true
    });
}

function getProfileName(profile) {
    return profile && profile.name ? profile.name : DEFAULT_PROFILE.name;
}

function writeBotLog(logger, profile, type, message) {
    if (!logger || typeof logger.log !== 'function') {
        return;
    }
    logger.log('[BOT][' + getProfileName(profile) + '][' + type + '] ' + message);
}

function sendEventChat(socket, profile, message) {
    if (!socket || typeof socket.emit !== 'function' || !message) {
        return;
    }
    socket.emit('playerChat', {
        sender: getProfileName(profile),
        message
    });
}

function getMassTotal(player) {
    if (player && typeof player.massTotal === 'number') {
        return player.massTotal;
    }
    if (player && typeof player.mass === 'number') {
        return player.mass;
    }
    return null;
}

function countEntries(entries) {
    return Array.isArray(entries) ? entries.length : 0;
}

function findMoveAction(actions) {
    return (actions || []).find((action) => action && action.type === 'moveTarget') || null;
}

function formatPoint(point) {
    if (!point || typeof point.x !== 'number' || typeof point.y !== 'number') {
        return 'unknown';
    }
    return Math.round(point.x) + ',' + Math.round(point.y);
}

function logMovement(logger, profile, state, actions, visiblePlayers, visibleFood, visibleViruses, visiblePartLoot) {
    const moveAction = findMoveAction(actions);
    if (!moveAction) {
        return;
    }
    writeBotLog(
        logger,
        profile,
        'move',
        'pos=' + formatPoint(state.player)
            + ' mass=' + (getMassTotal(state.player) || 0)
            + ' target=' + formatPoint(moveAction.target)
            + ' visiblePlayers=' + countEntries(visiblePlayers)
            + ' food=' + countEntries(visibleFood)
            + ' viruses=' + countEntries(visibleViruses)
            + ' parts=' + countEntries(visiblePartLoot)
    );
}

function getSettlementActorName(event) {
    const safeEvent = event || {};
    return safeEvent.fromPlayerName
        || safeEvent.toPlayerName
        || safeEvent.playerName
        || safeEvent.fromPlayerId
        || safeEvent.toPlayerId
        || safeEvent.playerId
        || 'unknown';
}

function getPartDisplayName(event) {
    const safeEvent = event || {};
    return safeEvent.displayName || safeEvent.partType || safeEvent.partId || 'body part';
}

function getDevourVictimName(event) {
    const safeEvent = event || {};
    return safeEvent.fromPlayerName
        || safeEvent.playerName
        || safeEvent.fromPlayerId
        || safeEvent.playerId
        || 'unknown';
}

function getDevourEaterName(event) {
    const safeEvent = event || {};
    return safeEvent.toPlayerName
        || safeEvent.actorName
        || safeEvent.toPlayerId
        || 'unknown';
}

function isOwnSettlementLoss(profile, state, event) {
    const safeEvent = event || {};
    const botName = getProfileName(profile);
    const playerId = state.player && state.player.id;

    return safeEvent.fromPlayerName === botName
        || Boolean(playerId && safeEvent.fromPlayerId === playerId);
}

function logSettlementKeyEvent(logger, profile, state, event) {
    const safeEvent = event || {};
    const eventType = safeEvent.eventType || safeEvent.type || '';

    if (eventType === 'part_stolen' || eventType === 'stolen') {
        if (isOwnSettlementLoss(profile, state, safeEvent)) {
            writeBotLog(logger, profile, 'devoured', '被 ' + getDevourEaterName(safeEvent) + ' devour');
            return;
        }
        writeBotLog(logger, profile, 'devour', 'devour ' + getSettlementActorName(safeEvent));
    }
}

function buildSettlementEventChat(profile, state, event) {
    const safeEvent = event || {};
    const eventType = safeEvent.eventType || safeEvent.type || '';
    const displayName = getPartDisplayName(safeEvent);

    if (eventType === 'part_stolen' || eventType === 'stolen') {
        if (isOwnSettlementLoss(profile, state, safeEvent)) {
            return '我被 ' + getDevourEaterName(safeEvent) + ' 吃了，失去' + displayName;
        }
        return '我吃了 ' + getDevourVictimName(safeEvent) + '，拿到' + displayName;
    }

    return '';
}

function createBotClient(options) {
    const settings = options || {};
    const state = {
        socket: null,
        player: null,
        game: null,
        botMemory: {},
        syncCount: 0,
        lastMassTotal: null
    };
    const ioFactory = settings.ioFactory || socketIoClient;
    const serverUrl = settings.serverUrl || DEFAULT_SERVER_URL;
    const profile = Object.assign({}, settings.profile || {});
    const logger = settings.logger || null;
    const behaviorLogEveryTicks = settings.behaviorLogEveryTicks || DEFAULT_BEHAVIOR_LOG_EVERY_TICKS;

    function connect() {
        const socket = ioFactory(serverUrl, {
            query: {
                type: 'player'
            }
        });
        state.socket = socket;

        socket.on('connect', function () {
            socket.emit('gotit', buildEntryPayload(profile));
        });

        socket.on('welcome', function (player, game) {
            state.player = player || null;
            state.game = game || null;
            state.botMemory = {};
            state.syncCount = 0;
            state.lastMassTotal = getMassTotal(state.player);
        });

        socket.on('serverTellPlayerMove', function (playerData, visiblePlayers, visibleFood, visibleMass, visibleViruses, visiblePartLoot, visibleGhosts) {
            const previousMassTotal = state.lastMassTotal;
            state.player = Object.assign({}, state.player || {}, playerData || {});
            state.syncCount += 1;
            const actions = planBotActions({
                player: state.player,
                game: state.game,
                visiblePlayers,
                visibleFood,
                visibleMass,
                visibleViruses,
                visiblePartLoot,
                visibleGhosts,
                profile,
                memory: state.botMemory
            });
            applyBotActions(socket, actions, {player: state.player, profile});
            const nextMassTotal = getMassTotal(state.player);
            if (previousMassTotal !== null && nextMassTotal !== null && nextMassTotal > previousMassTotal) {
                const massGain = nextMassTotal - previousMassTotal;
                writeBotLog(logger, profile, 'eat', 'mass +' + massGain + ' -> ' + nextMassTotal);
                sendEventChat(socket, profile, '我吃到了食物，质量 +' + massGain);
            }
            if (nextMassTotal !== null) {
                state.lastMassTotal = nextMassTotal;
            }
            if (state.syncCount === 1 || state.syncCount % behaviorLogEveryTicks === 0) {
                logMovement(logger, profile, state, actions, visiblePlayers, visibleFood, visibleViruses, visiblePartLoot);
            }
        });

        socket.on('settlement', function (data) {
            const keyEvents = data && Array.isArray(data.keyEvents) ? data.keyEvents : [];
            keyEvents.forEach((event) => {
                logSettlementKeyEvent(logger, profile, state, event);
                sendEventChat(socket, profile, buildSettlementEventChat(profile, state, event));
            });
        });

        socket.on('playerDied', function (data) {
            const playerName = data && (data.playerEatenName || data.name) ? (data.playerEatenName || data.name) : 'unknown';
            writeBotLog(logger, profile, 'devour', playerName + ' 被吃掉');
        });

        return socket;
    }

    function getState() {
        return Object.assign({}, state);
    }

    function disconnect() {
        if (state.socket && typeof state.socket.close === 'function') {
            state.socket.close();
        }
    }

    return {
        connect,
        disconnect,
        getState
    };
}

module.exports = {
    DEFAULT_SERVER_URL,
    buildEntryPayload,
    createBotClient
};
