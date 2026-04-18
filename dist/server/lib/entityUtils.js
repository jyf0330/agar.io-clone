"use strict";

const util = require("./util");
function getPosition(isUniform, radius, uniformPositions) {
  return isUniform ? util.uniformPosition(uniformPositions, radius) : util.randomPosition(radius);
}
function isVisibleEntity(entity, player, addThreshold = true) {
  const entityHalfSize = entity.radius + (addThreshold ? entity.radius * 0.1 : 0);
  const visionRangeBonus = player.bodyBonuses ? player.bodyBonuses.visionRangeBonus : 0;
  return util.testRectangleRectangle(entity.x, entity.y, entityHalfSize, entityHalfSize, player.x, player.y, player.screenWidth / 2 + visionRangeBonus, player.screenHeight / 2 + visionRangeBonus);
}
module.exports = {
  getPosition,
  isVisibleEntity
};