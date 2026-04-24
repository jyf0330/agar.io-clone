/*jshint expr:true */

const expect = require('chai').expect;
const activePet = require('../../apps/server/src/npc/active-pet');

describe('active-pet.js', () => {
  it('should resolve the roster npc that matches the current active pet', () => {
    const roster = [
      { id: 'mochi', player: { name: 'Mochi' } },
      { id: 'doudou', player: { name: 'Doudou' } }
    ];
    const player = {
      activePet: {
        petId: 'doudou'
      }
    };

    expect(activePet.getActiveNpc(roster, player)).to.equal(roster[1]);
  });

  it('should optionally avoid falling back to the first npc', () => {
    const roster = [
      { id: 'mochi', player: { name: 'Mochi' } }
    ];
    const player = {
      activePet: {
        petId: 'wugui'
      }
    };

    expect(activePet.getActiveNpc(roster, player, { fallbackToFirst: false })).to.equal(null);
  });
});
