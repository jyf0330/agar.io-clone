'use strict';

const PLAYER_SYNC_FIELDS = [
    'x',
    'y',
    'hue',
    'massTotal',
    'invincibleUntil',
    'isInvincible',
    'materialization',
    'materializationStage',
    'connectionStatus',
    'connectionTargetId',
    'connectionTargetName',
    'intimacy',
    'spike',
    'pollution',
    'bodyParts',
    'bodyPartCount',
    'bodyPartCounts',
    'bodySignature',
    'activePet',
    'npcRelationships',
    'bodyAssembly',
    'playerCardPreviewDataUrl',
    'ghostDebug',
    'roundTimer',
    'cells'
];

function hasField(payload, fieldName) {
    return Object.prototype.hasOwnProperty.call(payload, fieldName);
}

function hydratePlayerState(player, playerData) {
    if (!player || !playerData) {
        return player;
    }

    PLAYER_SYNC_FIELDS.forEach((fieldName) => {
        if (hasField(playerData, fieldName)) {
            player[fieldName] = playerData[fieldName];
        }
    });

    return player;
}

module.exports = hydratePlayerState;
module.exports.PLAYER_SYNC_FIELDS = PLAYER_SYNC_FIELDS;
