/*jshint expr:true */

const expect = require('chai').expect;
const playerUtils = require('../../apps/server/src/map/player');

describe('player manager', () => {
  it('should keep npc pets out of pvp leaderboard and mass balance totals', () => {
    const players = new playerUtils.PlayerManager();
    const alice = new playerUtils.Player('alice');
    const pet = new playerUtils.Player('npc-mochi');

    alice.init({ x: 100, y: 100 }, 20);
    alice.name = 'Alice';
    pet.init({ x: 120, y: 120 }, 200);
    pet.name = 'Mochi';
    pet.isNpc = true;

    players.pushNew(alice);
    players.pushNew(pet);

    expect(players.getTopPlayers()).to.deep.equal([{id: 'alice', name: 'Alice'}]);
    expect(players.getTotalMass()).to.equal(20);
  });
});
