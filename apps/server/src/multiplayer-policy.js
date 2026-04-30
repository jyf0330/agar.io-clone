'use strict';

const playerKind = require('./player-kind');

function isBotCompetitive(config) {
    return !config || !config.botPlayers || config.botPlayers.competitive !== false;
}

function createMultiplayerPolicy(config) {
    function isCompetitivePlayer(player) {
        const kind = playerKind.getPlayerKind(player);
        if (kind === playerKind.PLAYER_KIND_NPC) {
            return false;
        }
        if (kind === playerKind.PLAYER_KIND_BOT) {
            return isBotCompetitive(config);
        }
        return true;
    }

    function canWinRound(player) {
        return isCompetitivePlayer(player);
    }

    return {
        isCompetitivePlayer,
        canWinRound
    };
}

const defaultPolicy = createMultiplayerPolicy({});

module.exports = Object.assign({
    createMultiplayerPolicy
}, defaultPolicy);
