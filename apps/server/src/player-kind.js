'use strict';

const PLAYER_KIND_HUMAN = 'human';
const PLAYER_KIND_BOT = 'bot';
const PLAYER_KIND_NPC = 'npc';

function getPlayerKind(player) {
    if (!player) {
        return PLAYER_KIND_HUMAN;
    }
    if (player.isNpc) {
        return PLAYER_KIND_NPC;
    }
    if (player.isBot) {
        return PLAYER_KIND_BOT;
    }
    if (player.playerKind) {
        return player.playerKind;
    }
    return PLAYER_KIND_HUMAN;
}

function markHumanPlayer(player) {
    player.playerKind = PLAYER_KIND_HUMAN;
    player.isBot = false;
    player.isNpc = false;
    return player;
}

function markBotPlayer(player) {
    player.playerKind = PLAYER_KIND_BOT;
    player.isBot = true;
    player.isNpc = false;
    return player;
}

function markNpcActor(player) {
    player.playerKind = PLAYER_KIND_NPC;
    player.isBot = false;
    player.isNpc = true;
    return player;
}

function isCompetitivePlayer(player) {
    return getPlayerKind(player) !== PLAYER_KIND_NPC;
}

module.exports = {
    PLAYER_KIND_HUMAN,
    PLAYER_KIND_BOT,
    PLAYER_KIND_NPC,
    getPlayerKind,
    markHumanPlayer,
    markBotPlayer,
    markNpcActor,
    isCompetitivePlayer
};
