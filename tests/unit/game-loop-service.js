/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const createGameLoopService = require('../../apps/server/src/game-loop-service');
const mapUtils = require('../../apps/server/src/map/map');
const playerUtils = require('../../apps/server/src/map/player');

describe('game-loop-service.js', () => {
  it('should equip part loot when a player touches it', () => {
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'collector',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);
    map.partLoot.addPart({
      type: 'HAND',
      templateId: 'hand-thread',
      source: 'ghost-echo'
    }, { x: 100, y: 100 });

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    service.tickPlayer(player);

    const hand = player.bodyParts.find((part) => part.type === 'HAND');
    expect(hand.templateId).to.equal('hand-thread');
    expect(hand.source).to.equal('ghost-echo');
    expect(map.partLoot.data[0].source).to.equal('slot-replacement');
  });
});
