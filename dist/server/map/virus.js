"use strict";

const util = require('../lib/util');
const id = require('../lib/id');
const {
  getPosition
} = require("../lib/entityUtils");
class Virus {
  constructor(position, radius, mass, config) {
    this.id = id.createId();
    this.x = position.x;
    this.y = position.y;
    this.radius = radius;
    this.mass = mass;
    this.fill = config.fill;
    this.stroke = config.stroke;
    this.strokeWidth = config.strokeWidth;
  }
}
exports.VirusManager = class {
  constructor(virusConfig) {
    this.data = [];
    this.virusConfig = virusConfig;
  }
  pushNew(virus) {
    this.data.push(virus);
  }
  addNew(number) {
    while (number--) {
      var mass = util.randomInRange(this.virusConfig.defaultMass.from, this.virusConfig.defaultMass.to);
      var radius = util.massToRadius(mass);
      var position = getPosition(this.virusConfig.uniformDisposition, radius, this.data);
      var newVirus = new Virus(position, radius, mass, this.virusConfig);
      this.pushNew(newVirus);
    }
  }
  delete(virusCollision) {
    if (typeof virusCollision === 'number') {
      this.data.splice(virusCollision, 1);
      return;
    }
    if (Array.isArray(virusCollision) && virusCollision.length > 0) {
      this.data = util.removeIndexes(this.data, virusCollision);
    }
  }
};