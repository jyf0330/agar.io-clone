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
  balanceWorldParts(options) {
    const settings = options || {};
    const templates = Array.isArray(settings.templates) && settings.templates.length ? settings.templates : [{
      type: 'HAND',
      templateId: 'hand-open'
    }];
    const maxWorldParts = typeof settings.maxWorldParts === 'number' ? settings.maxWorldParts : 0;
    const spawnBatch = typeof settings.spawnBatch === 'number' ? settings.spawnBatch : 1;
    const random = typeof settings.random === 'function' ? settings.random : Math.random;
    const gameWidth = typeof settings.gameWidth === 'number' ? settings.gameWidth : 5000;
    const gameHeight = typeof settings.gameHeight === 'number' ? settings.gameHeight : 5000;
    const spawnCount = Math.min(spawnBatch, Math.max(0, maxWorldParts - this.data.length));
    if (!settings.enabled || spawnCount <= 0) {
      return [];
    }
    const spawned = [];
    for (let index = 0; index < spawnCount; index++) {
      const template = templates[Math.min(templates.length - 1, Math.floor(random() * templates.length))];
      spawned.push(this.addPart(Object.assign({}, template, {
        sourceType: 'map_pickup'
      }), {
        x: Math.round(random() * gameWidth),
        y: Math.round(random() * gameHeight)
      }, 'map-pickup'));
    }
    return spawned;
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