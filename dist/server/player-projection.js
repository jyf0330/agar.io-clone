'use strict';

const HASH_MOD = 4294967291;
function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) % HASH_MOD;
  }
  return hash.toString(36);
}
function createValueSignature(value) {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'undefined') {
    return 'undefined';
  }
  if (typeof value === 'string') {
    return 's:' + value.length + ':' + hashString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return typeof value + ':' + String(value);
  }
  if (Array.isArray(value)) {
    return 'a:' + value.length + '[' + value.map(createValueSignature).join('|') + ']';
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return 'o:' + keys.length + '{' + keys.map(key => {
      return key + ':' + createValueSignature(value[key]);
    }).join('|') + '}';
  }
  return typeof value + ':' + String(value);
}
function createPlayerMetaSignature(meta) {
  return createValueSignature(meta);
}
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
  if (!activePet) {
    return null;
  }
  return {
    petId: activePet.petId || activePet.npcId || null,
    npcId: activePet.npcId || activePet.petId || null,
    name: activePet.name || '',
    personality: activePet.personality || '',
    ownerPlayerId: activePet.ownerPlayerId || null,
    active: activePet.active !== false,
    radius: typeof activePet.radius === 'number' ? activePet.radius : null,
    memoryKey: activePet.memoryKey || null
  };
}
function projectActivePetMovementForSync(activePet) {
  if (!activePet) {
    return null;
  }
  return {
    petId: activePet.petId || activePet.npcId || null,
    npcId: activePet.npcId || activePet.petId || null,
    name: activePet.name || '',
    active: activePet.active !== false,
    x: typeof activePet.x === 'number' ? activePet.x : null,
    y: typeof activePet.y === 'number' ? activePet.y : null,
    radius: typeof activePet.radius === 'number' ? activePet.radius : null
  };
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
    bodyAssembly: player.bodyAssembly ? Object.assign({}, player.bodyAssembly) : null,
    playerCardPreviewDataUrl: player.playerCardPreviewDataUrl,
    hue: player.hue,
    isNpc: Boolean(player.isNpc),
    npcId: player.npcId || null,
    skeletonKey: player.skeletonKey || null,
    id: player.id,
    name: player.name
  };
}
function projectPlayerMovementForSync(player) {
  return {
    x: player.x,
    y: player.y,
    cells: (player.cells || []).map(projectCellForSync),
    massTotal: Math.round(player.massTotal),
    activePet: projectActivePetMovementForSync(player.activePet),
    hue: player.hue,
    isNpc: Boolean(player.isNpc),
    npcId: player.npcId || null,
    skeletonKey: player.skeletonKey || null,
    id: player.id,
    name: player.name
  };
}
function projectPlayerMetaForSync(player) {
  return {
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
    bodyAssembly: player.bodyAssembly ? Object.assign({}, player.bodyAssembly) : null,
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
function projectPlayersMovementForSync(players) {
  return (players || []).map(projectPlayerMovementForSync);
}
function projectPlayersMetaForSync(players) {
  return (players || []).map(projectPlayerMetaForSync);
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
function projectVisibleWorldForMovementSync(visibleWorld) {
  return {
    playerData: projectPlayerMovementForSync(visibleWorld.player),
    visiblePlayers: projectPlayersMovementForSync(visibleWorld.visiblePlayers),
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
    bodyAssembly: null,
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
  projectPlayerMetaForSync,
  projectPlayerMovementForSync,
  projectPlayerForSync,
  projectPlayersMetaForSync,
  projectPlayersMovementForSync,
  projectPlayersForSync,
  projectVisibleWorldForMovementSync,
  projectVisibleWorldForSync,
  projectPartLootForSync,
  projectActivePetForSync,
  projectEquipmentSlotsForSync,
  projectGhostForSync,
  createSpectatorSyncData,
  createPlayerMetaSignature
};