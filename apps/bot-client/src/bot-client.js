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
const DEFAULT_BEHAVIOR_CHAT_COOLDOWN_MS = 5000;
const COMPLETION_PART_TYPES = ['HEAD', 'HAND', 'FOOT', 'MOUTH', 'HEART'];

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

function getPartType(part) {
    return part && (part.partType || part.type || '').toUpperCase();
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

function getBodyPartDisplayName(part, event) {
    const safePart = part || {};
    const safeEvent = event || {};
    return safeEvent.displayName
        || safePart.displayName
        || safePart.label
        || safePart.templateId
        || safePart.partType
        || safePart.type
        || safePart.partId
        || safePart.id
        || 'body part';
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

function isOwnSettlementGain(profile, state, event) {
    const safeEvent = event || {};
    const botName = getProfileName(profile);
    const playerId = state.player && state.player.id;

    return safeEvent.toPlayerName === botName
        || safeEvent.actorName === botName
        || Boolean(playerId && (safeEvent.toPlayerId === playerId || safeEvent.actorId === playerId));
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
        if (isOwnSettlementGain(profile, state, safeEvent)) {
            return '我吃了 ' + getDevourVictimName(safeEvent) + '，拿到' + displayName;
        }
    }

    return '';
}

function isSettlementWinner(profile, state, settlement) {
    const safeSettlement = settlement || {};
    const winnerId = safeSettlement.winnerId || safeSettlement.winnerPlayerId || '';
    const winnerName = safeSettlement.winnerName || '';
    const playerId = state.player && state.player.id || '';
    const playerName = state.player && state.player.name || getProfileName(profile);

    return Boolean((winnerId && playerId && winnerId === playerId)
        || (winnerName && (winnerName === playerName || winnerName === getProfileName(profile))));
}

function sendBehaviorChat(state, socket, profile, key, message) {
    if (!message) {
        return false;
    }
    const now = state.now();
    const lastSentAt = state.lastBehaviorChatAt[key] || 0;
    if (state.behaviorChatCooldownMs > 0 && lastSentAt && now - lastSentAt < state.behaviorChatCooldownMs) {
        return false;
    }

    state.lastBehaviorChatAt[key] = now;
    sendEventChat(socket, profile, message);
    return true;
}

function sendSkillActionChats(state, socket, profile, actions) {
    (actions || []).forEach((action) => {
        if (!action || !action.type) {
            return;
        }
        if (action.type === 'ejectMass') {
            sendBehaviorChat(state, socket, profile, 'skill:ejectMass', '我吐出孢子');
        } else if (action.type === 'split') {
            sendBehaviorChat(state, socket, profile, 'skill:split', '我分裂了');
        } else if (action.type === 'attemptConnection') {
            sendBehaviorChat(state, socket, profile, 'skill:connection', '我尝试连接');
        }
    });
}

function findOwnMeta(playersMeta, state, profile) {
    const list = Array.isArray(playersMeta) ? playersMeta : [];
    const playerId = state.player && state.player.id;
    const playerName = state.player && state.player.name || getProfileName(profile);

    return list.find((entry) => {
        return entry
            && ((playerId && (entry.id === playerId || entry.playerId === playerId))
                || entry.name === playerName
                || entry.name === getProfileName(profile));
    }) || null;
}

function getBodyHistoryEventKey(part, event) {
    const safePart = part || {};
    const safeEvent = event || {};
    return safeEvent.eventId || [
        safePart.partId || safePart.id || '',
        safeEvent.eventType || '',
        safeEvent.playerId || '',
        safeEvent.fromPlayerId || '',
        safeEvent.toPlayerId || '',
        safeEvent.at || ''
    ].join('|');
}

function isOwnSelfCreatedPart(part, state, meta) {
    const ownId = meta && (meta.id || meta.playerId) || state.player && state.player.id;
    const sourceType = part && (part.sourceType || part.source);
    return Boolean(part && sourceType === 'self_created'
        && ownId
        && (part.originPlayerId === ownId || part.currentOwnerId === ownId));
}

function isForeignCompletionPart(part, state, meta) {
    if (!part || isOwnSelfCreatedPart(part, state, meta)) {
        return false;
    }
    const sourceType = part.sourceType || part.source || '';
    return sourceType !== 'self_created' && sourceType !== 'starter_loadout';
}

function hasMetaBodyCompletion(state, meta) {
    const parts = Array.isArray(meta && meta.bodyParts) ? meta.bodyParts : [];
    const ownTypes = COMPLETION_PART_TYPES.filter((type) => {
        return parts.some((part) => getPartType(part) === type && isOwnSelfCreatedPart(part, state, meta));
    });
    if (ownTypes.length !== 1) {
        return false;
    }
    return COMPLETION_PART_TYPES.every((type) => {
        if (ownTypes.indexOf(type) > -1) {
            return true;
        }
        return parts.some((part) => getPartType(part) === type && isForeignCompletionPart(part, state, meta));
    });
}

function getBodyPartCount(meta) {
    if (typeof (meta && meta.bodyPartCount) === 'number') {
        return meta.bodyPartCount;
    }
    if (Array.isArray(meta && meta.bodyParts)) {
        return meta.bodyParts.length;
    }
    return null;
}

function recordMetaHistoryEvents(state, socket, profile, meta) {
    const parts = Array.isArray(meta && meta.bodyParts) ? meta.bodyParts : [];
    const ownId = meta && (meta.id || meta.playerId) || state.player && state.player.id;

    parts.forEach((part) => {
        const chain = Array.isArray(part && part.historyChain) ? part.historyChain : [];
        chain.forEach((event) => {
            const eventType = event && event.eventType || '';
            const key = getBodyHistoryEventKey(part, event);
            if (!key || state.seenBodyHistoryEvents[key]) {
                return;
            }
            state.seenBodyHistoryEvents[key] = true;

            const displayName = getBodyPartDisplayName(part, event);
            if (eventType === 'picked' || eventType === 'part_pickup') {
                sendEventChat(socket, profile, '我捡到了 ' + displayName);
                return;
            }
            if ((eventType === 'stolen' || eventType === 'part_stolen')
                && ownId
                && (event.toPlayerId === ownId || part.currentOwnerId === ownId)) {
                const victimName = event.playerName || event.fromPlayerName || event.fromPlayerId || 'unknown';
                sendEventChat(socket, profile, '我吃了 ' + victimName + '，拿到' + displayName);
            }
        });
    });
}

function handlePlayerMetaUpdate(state, socket, profile, playersMeta) {
    const ownMeta = findOwnMeta(playersMeta, state, profile);
    if (!ownMeta) {
        return;
    }

    const bodyPartCount = getBodyPartCount(ownMeta);
    if (typeof state.lastBodyPartCount === 'number'
        && typeof bodyPartCount === 'number'
        && bodyPartCount < state.lastBodyPartCount) {
        sendEventChat(socket, profile, '我被别人吃了，部位数 ' + state.lastBodyPartCount + ' -> ' + bodyPartCount);
    }

    recordMetaHistoryEvents(state, socket, profile, ownMeta);

    if (!state.bodyCompleteChatted && hasMetaBodyCompletion(state, ownMeta)) {
        state.bodyCompleteChatted = true;
        sendEventChat(socket, profile, '我完成身体了');
    }

    if (typeof bodyPartCount === 'number') {
        state.lastBodyPartCount = bodyPartCount;
    }
    state.player = Object.assign({}, state.player || {}, ownMeta);
}

function isOwnDeathEvent(profile, state, data) {
    const safeData = data || {};
    const playerId = state.player && state.player.id;
    const playerName = state.player && state.player.name || getProfileName(profile);
    const eatenId = safeData.playerEatenId || safeData.id || safeData.playerId || '';
    const eatenName = safeData.playerEatenName || safeData.name || '';

    return Boolean((playerId && eatenId && playerId === eatenId)
        || (eatenName && (eatenName === playerName || eatenName === getProfileName(profile))));
}

function createBotClient(options) {
    const settings = options || {};
    const state = {
        socket: null,
        player: null,
        game: null,
        botMemory: {},
        syncCount: 0,
        lastMassTotal: null,
        lastBodyPartCount: null,
        seenBodyHistoryEvents: {},
        bodyCompleteChatted: false,
        lastBehaviorChatAt: {},
        needsEntryPayloadOnWelcome: false,
        respawning: false,
        behaviorChatCooldownMs: typeof settings.behaviorChatCooldownMs === 'number'
            ? settings.behaviorChatCooldownMs
            : DEFAULT_BEHAVIOR_CHAT_COOLDOWN_MS,
        now: typeof settings.now === 'function' ? settings.now : Date.now
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
            state.lastBodyPartCount = null;
            state.seenBodyHistoryEvents = {};
            state.bodyCompleteChatted = false;
            state.lastBehaviorChatAt = {};
            state.respawning = false;
            if (state.needsEntryPayloadOnWelcome) {
                state.needsEntryPayloadOnWelcome = false;
                socket.emit('gotit', buildEntryPayload(profile));
            }
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
            sendSkillActionChats(state, socket, profile, actions);
            const nextMassTotal = getMassTotal(state.player);
            if (previousMassTotal !== null && nextMassTotal !== null && nextMassTotal > previousMassTotal) {
                const massGain = nextMassTotal - previousMassTotal;
                writeBotLog(logger, profile, 'eat', 'mass +' + massGain + ' -> ' + nextMassTotal);
            }
            if (nextMassTotal !== null) {
                state.lastMassTotal = nextMassTotal;
            }
            if (state.syncCount === 1 || state.syncCount % behaviorLogEveryTicks === 0) {
                logMovement(logger, profile, state, actions, visiblePlayers, visibleFood, visibleViruses, visiblePartLoot);
            }
        });

        socket.on('playerMetaUpdate', function (playersMeta) {
            handlePlayerMetaUpdate(state, socket, profile, playersMeta);
        });

        socket.on('settlement', function (data) {
            const keyEvents = data && Array.isArray(data.keyEvents) ? data.keyEvents : [];
            keyEvents.forEach((event) => {
                logSettlementKeyEvent(logger, profile, state, event);
                sendEventChat(socket, profile, buildSettlementEventChat(profile, state, event));
            });
            if (data && data.endedReason === 'body_complete'
                && isSettlementWinner(profile, state, data)
                && !state.bodyCompleteChatted) {
                state.bodyCompleteChatted = true;
                sendEventChat(socket, profile, '我完成身体了');
            }
        });

        socket.on('playerDied', function (data) {
            const playerName = data && (data.playerEatenName || data.name) ? (data.playerEatenName || data.name) : 'unknown';
            if (isOwnDeathEvent(profile, state, data)) {
                writeBotLog(logger, profile, 'devoured', '自己被吃掉');
                sendBehaviorChat(state, socket, profile, 'event:ownDied', '我被吃掉了');
                return;
            }
            writeBotLog(logger, profile, 'devour', playerName + ' 被吃掉');
        });

        socket.on('RIP', function () {
            if (state.respawning) {
                return;
            }
            state.player = null;
            state.lastMassTotal = null;
            state.lastBodyPartCount = null;
            state.needsEntryPayloadOnWelcome = true;
            state.respawning = true;
            socket.emit('respawn');
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
