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
  addPart(part, position, source) {
    const loot = {
      id: 'part-loot-' + this.nextId,
      x: position.x,
      y: position.y,
      radius: DEFAULT_RADIUS,
      source: source || part.source || 'world',
      part: body.cloneBodyPart(part)
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
      const result = body.equipBodyPart(player, loot.part, {
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