/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const mapUtils = require('../../apps/server/src/map/map');
const playerUtils = require('../../apps/server/src/map/player');

describe('map visibility', () => {
  it('should keep mass balancing quiet by default', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      gameMass: 10,
      maxFood: 10,
      maxVirus: 0,
      partLoot: {
        enabled: false
      }
    }));
    const originalDebug = console.debug;
    const messages = [];
    console.debug = function (message) {
      messages.push(message);
    };

    try {
      map.balanceMass(1, 10, 10, 0);
    } finally {
      console.debug = originalDebug;
    }

    expect(messages).to.deep.equal([]);
    expect(map.food.data).to.have.length(10);
  });

  it('should return raw visible world entities without projecting player DTOs', () => {
    const map = new mapUtils.Map(config);
    const viewer = new playerUtils.Player('viewer');
    const target = new playerUtils.Player('target');

    viewer.init({ x: 200, y: 200 }, config.defaultPlayerMass);
    viewer.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });

    target.init({ x: 220, y: 220 }, config.defaultPlayerMass);
    target.clientProvidedData({
      name: 'target',
      screenWidth: 800,
      screenHeight: 600
    });

    map.players.pushNew(viewer);
    map.players.pushNew(target);
    map.partLoot.addPart({
      type: 'HAND',
      templateId: 'hand-open'
    }, { x: 210, y: 210 });

    const visibleWorld = map.getVisibleWorldForPlayer(viewer);

    expect(visibleWorld.player).to.equal(viewer);
    expect(visibleWorld.visiblePlayers[1]).to.equal(target);
    expect(visibleWorld.visiblePlayers[1].cells[0].toCircle).to.be.a('function');
    expect(visibleWorld.visiblePartLoot[0].part.templateId).to.equal('hand-open');
  });
});
