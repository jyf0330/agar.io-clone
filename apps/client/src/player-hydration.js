'use strict';

const PLAYER_SYNC_FIELDS = [
    'x',
    'y',
    'hue',
    'massTotal',
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
    'npcRelationships',
    'playerCardPreviewDataUrl',
    'ghostDebug',
    'cells'
];

function hydratePlayerState(player, playerData) {
    if (!player || !playerData) {
        return player;
    }

    PLAYER_SYNC_FIELDS.forEach((fieldName) => {
        player[fieldName] = playerData[fieldName];
    });

    return player;
}

module.exports = hydratePlayerState;
module.exports.PLAYER_SYNC_FIELDS = PLAYER_SYNC_FIELDS;
