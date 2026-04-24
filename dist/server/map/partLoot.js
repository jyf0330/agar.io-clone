"use strict";

const body = require('../body');
const DEFAULT_RADIUS = 28;
function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}
function canCollectLoot(player, loot) {
  return (player.cells || []).some(cell => {
    return distance(cell, loot) <= cell.radius + loot.radius;
  });
}
class PartLootManager {
  constructor() {
    this.data = [];
    this.nextId = 1;
  }
  getSourceType(part, source) {
    if (part && part.sourceType) {
      return part.sourceType;
    }
    if (source === 'npc-task') {
      return 'npc_reward';
    }
    if (source === 'ghost-echo') {
      return 'ghost_echo';
    }
    return 'map_pickup';
  }
  normalizePart(part, source) {
    const safePart = part || {};
    return body.createBodyPart(safePart.partType || safePart.type || 'HAND', 1, Object.assign({}, safePart, {
      source: safePart.source || source || 'world',
      sourceType: this.getSourceType(safePart, source)
    }));
  }
  addPart(part, position, source) {
    const normalizedPart = this.normalizePart(part, source);
    const loot = {
      id: 'part-loot-' + this.nextId,
      x: position.x,
      y: position.y,
      radius: DEFAULT_RADIUS,
      source: source || normalizedPart.source || 'world',
      part: normalizedPart
    };
    this.nextId += 1;
    this.data.push(loot);
    return loot;
  }
  collectForPlayer(player) {
    const pickups = [];
    const remaining = [];
    const replacementDrops = [];
    this.data.forEach(loot => {
      if (!canCollectLoot(player, loot)) {
        remaining.push(loot);
        return;
      }
      const pickedPart = body.appendPartHistory(loot.part, 'picked', {
        playerId: player.id || null,
        playerName: player.name || null,
        x: loot.x,
        y: loot.y,
        sourceType: loot.part.sourceType
      });
      pickedPart.currentOwnerId = player.id || null;
      const result = body.equipBodyPart(player, pickedPart, {
        x: loot.x,
        y: loot.y
      });
      pickups.push({
        loot: loot,
        equippedPart: result.equippedPart,
        droppedPart: result.droppedPart
      });
      if (result.droppedPart) {
        replacementDrops.push({
          part: result.droppedPart,
          position: {
            x: loot.x,
            y: loot.y
          }
        });
      }
    });
    this.data = remaining;
    replacementDrops.forEach(drop => {
      this.addPart(drop.part, drop.position, 'slot-replacement');
    });
    return pickups;
  }
}
module.exports = {
  PartLootManager
};