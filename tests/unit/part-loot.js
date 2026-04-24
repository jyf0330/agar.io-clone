/*jshint expr:true */

const expect = require('chai').expect;
const body = require('../../apps/server/src/body');
const {PartLootManager} = require('../../apps/server/src/map/partLoot');

describe('partLoot.js', () => {
  it('should add complete body parts as visible world loot', () => {
    const manager = new PartLootManager();

    const loot = manager.addPart({
      type: 'HAND',
      templateId: 'hand-open',
      source: 'ghost-echo',
      signatureBonus: { connectionRangeBonus: 10 }
    }, { x: 120, y: 140 });

    expect(loot.id).to.equal('part-loot-1');
    expect(loot.x).to.equal(120);
    expect(loot.y).to.equal(140);
    expect(loot.radius).to.equal(28);
    expect(loot.part.templateId).to.equal('hand-open');
    expect(loot.part.signatureBonus.connectionRangeBonus).to.equal(10);
  });

  it('should equip collected loot and drop the replaced slot part', () => {
    const manager = new PartLootManager();
    const player = body.createBodyState([
      body.createBodyPart('HAND', 1, {
        templateId: 'hand-open',
        source: 'signature-drawing'
      })
    ]);
    player.x = 100;
    player.y = 100;
    player.cells = [
      { x: 100, y: 100, radius: 40 }
    ];

    manager.addPart({
      type: 'HAND',
      templateId: 'hand-thread',
      source: 'npc-task'
    }, { x: 112, y: 100 });

    const pickups = manager.collectForPlayer(player);
    const equippedHand = player.bodyParts.find((part) => part.type === 'HAND');

    expect(pickups).to.have.length(1);
    expect(equippedHand.templateId).to.equal('hand-thread');
    expect(manager.data).to.have.length(1);
    expect(manager.data[0].part.templateId).to.equal('hand-open');
    expect(manager.data[0].source).to.equal('slot-replacement');
  });

  it('should append picked history and transfer ownership before equipping loot', () => {
    const manager = new PartLootManager();
    const player = body.createBodyState([]);
    player.id = 'player-1';
    player.name = 'Alice';
    player.x = 100;
    player.y = 100;
    player.cells = [
      { x: 100, y: 100, radius: 40 }
    ];

    manager.addPart({
      type: 'HAND',
      templateId: 'hand-thread',
      sourceType: 'map_pickup',
      currentOwnerId: null
    }, { x: 112, y: 100 }, 'map-pickup');

    const pickups = manager.collectForPlayer(player);
    const equippedHand = player.bodyParts.find((part) => part.partType === 'HAND');
    const historyTypes = equippedHand.historyChain.map((entry) => entry.eventType);

    expect(pickups[0].equippedPart.currentOwnerId).to.equal('player-1');
    expect(equippedHand.currentOwnerId).to.equal('player-1');
    expect(historyTypes).to.include('picked');
    expect(historyTypes).to.include('equipped');
  });

  it('should naturally spawn configured map pickup parts up to the world cap', () => {
    const manager = new PartLootManager();

    manager.balanceWorldParts({
      enabled: true,
      maxWorldParts: 2,
      spawnBatch: 2,
      gameWidth: 500,
      gameHeight: 400,
      random: () => 0.5,
      templates: [
        {
          type: 'HAND',
          templateId: 'hand-open',
          displayName: 'Open Hand',
          stats: {
            pickupRange: 10
          }
        }
      ]
    });

    expect(manager.data).to.have.length(2);
    expect(manager.data[0].source).to.equal('map-pickup');
    expect(manager.data[0].x).to.equal(250);
    expect(manager.data[0].y).to.equal(200);
    expect(manager.data[0].part.sourceType).to.equal('map_pickup');
    expect(manager.data[0].part.stats.pickupRange).to.equal(10);

    manager.balanceWorldParts({
      enabled: true,
      maxWorldParts: 2,
      spawnBatch: 2,
      gameWidth: 500,
      gameHeight: 400,
      random: () => 0.1,
      templates: [
        {
          type: 'FOOT',
          templateId: 'foot-default'
        }
      ]
    });

    expect(manager.data).to.have.length(2);
  });
});
