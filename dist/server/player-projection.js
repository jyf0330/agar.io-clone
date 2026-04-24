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
function projectEquipmentSlotsForSync(slots) {
  const safeSlots = slots || {};
  return Object.keys(safeSlots).reduce((projected, key) => {
    projected[key] = safeSlots[key] ? projectBodyPartForSync(safeSlots[key]) : null;
    return projected;
  }, {});
}
function projectPartLootForSync(loot) {
  return Object.assign({}, loot, {
    part: projectBodyPartForSync(loot.part)
  });
}
function projectGhostForSync(ghost) {
  return Object.assign({}, ghost);
}
function projectActivePetForSync(activePet) {
  return activePet ? Object.assign({}, activePet) : null;
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
    equipmentSlots: projectEquipmentSlotsForSync(player.equipmentSlots),
    bodySignature: player.bodySignature ? Object.assign({}, player.bodySignature) : null,
    activePet: projectActivePetForSync(player.activePet),
    npcRelationships: (player.npcRelationships || []).map(entry => Object.assign({}, entry)),
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
    visiblePartLoot: (visibleWorld.visiblePartLoot || []).map(projectPartLootForSync),
    visibleGhosts: (visibleWorld.visibleGhosts || []).map(projectGhostForSync),
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
    equipmentSlots: {},
    bodySignature: null,
    activePet: null,
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
  projectPartLootForSync,
  projectActivePetForSync,
  projectEquipmentSlotsForSync,
  projectGhostForSync,
  createSpectatorSyncData
};