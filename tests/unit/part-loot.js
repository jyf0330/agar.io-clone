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
});
