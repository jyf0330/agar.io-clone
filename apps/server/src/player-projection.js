'use strict';

function projectCellForSync(cell) {
    return {
        x: cell.x,
        y: cell.y,
        mass: cell.mass,
        radius: cell.radius,
        speed: cell.speed
    };
}

function projectBodyPartForSync(part) {
    return Object.assign({}, part);
}

function projectPlayerForSync(player) {
    return {
        x: player.x,
        y: player.y,
        cells: (player.cells || []).map(projectCellForSync),
        massTotal: Math.round(player.massTotal),
        materialization: player.materialization,
        materializationStage: player.materializationStage,
        connectionStatus: player.connectionStatus,
        connectionTargetId: player.connectionTargetId,
        connectionTargetName: player.connectionTargetName,
        intimacy: player.intimacy,
        spike: player.spike,
        pollution: player.pollution,
        bodyParts: (player.bodyParts || []).map(projectBodyPartForSync),
        bodyPartCount: player.bodyPartCount,
        bodyPartCounts: Object.assign({}, player.bodyPartCounts),
        bodySignature: player.bodySignature ? Object.assign({}, player.bodySignature) : null,
        npcRelationships: (player.npcRelationships || []).map((entry) => Object.assign({}, entry)),
        playerCardPreviewDataUrl: player.playerCardPreviewDataUrl,
        hue: player.hue,
        isNpc: Boolean(player.isNpc),
        npcId: player.npcId || null,
        skeletonKey: player.skeletonKey || null,
        id: player.id,
        name: player.name
    };
}

function projectPlayersForSync(players) {
    return (players || []).map(projectPlayerForSync);
}

function projectVisibleWorldForSync(visibleWorld) {
    return {
        playerData: projectPlayerForSync(visibleWorld.player),
        visiblePlayers: projectPlayersForSync(visibleWorld.visiblePlayers),
        visibleFood: visibleWorld.visibleFood,
        visibleMass: visibleWorld.visibleMass,
        visibleViruses: visibleWorld.visibleViruses
    };
}

function createSpectatorSyncData(socketID, config) {
    return {
        x: config.gameWidth / 2,
        y: config.gameHeight / 2,
        cells: [],
        massTotal: 0,
        materialization: null,
        materializationStage: null,
        connectionStatus: null,
        connectionTargetId: null,
        connectionTargetName: null,
        intimacy: 0,
        spike: 0,
        pollution: 0,
        bodyParts: [],
        bodyPartCount: 0,
        bodyPartCounts: {},
        bodySignature: null,
        npcRelationships: [],
        playerCardPreviewDataUrl: null,
        hue: 100,
        isNpc: false,
        npcId: null,
        skeletonKey: null,
        id: socketID,
        name: ''
    };
}

module.exports = {
    projectPlayerForSync,
    projectPlayersForSync,
    projectVisibleWorldForSync,
    createSpectatorSyncData
};
