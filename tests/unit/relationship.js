/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const relationshipConfig = require('../../configs/game/relationship');
const relationship = require('../../apps/server/src/relationship');
const connection = require('../../apps/server/src/connection');
const playerUtils = require('../../apps/server/src/map/player');
const mapUtils = require('../../apps/server/src/map/map');

describe('relationship.js', () => {
  describe('player defaults', () => {
    it('should initialize players with zeroed relationship attributes', () => {
      const player = new playerUtils.Player('player-1');
      player.init({ x: 100, y: 120 }, config.defaultPlayerMass);

      expect(player.intimacy).to.equal(0);
      expect(player.spike).to.equal(0);
      expect(player.pollution).to.equal(0);
    });
  });

  describe('applyConnectionOutcome', () => {
    it('should grant resonance rewards to both players', () => {
      const actor = relationship.createRelationshipState();
      const target = relationship.createRelationshipState();

      relationship.applyConnectionOutcome(actor, target, connection.STATES.RESONATING);

      expect(actor.intimacy).to.equal(relationshipConfig.resonatingDelta.intimacy);
      expect(target.intimacy).to.equal(relationshipConfig.resonatingDelta.intimacy);
      expect(actor.spike).to.equal(relationshipConfig.resonatingDelta.spike);
      expect(target.pollution).to.equal(relationshipConfig.resonatingDelta.pollution);
    });

    it('should apply break penalties without going below zero', () => {
      const actor = relationship.createRelationshipState();
      const target = relationship.createRelationshipState();

      relationship.applyConnectionOutcome(actor, target, connection.STATES.BREAK);

      expect(actor.intimacy).to.equal(0);
      expect(target.intimacy).to.equal(0);
      expect(actor.spike).to.equal(relationshipConfig.breakDelta.spike);
      expect(target.pollution).to.equal(relationshipConfig.breakDelta.pollution);
    });
  });

  describe('map synchronization payload', () => {
    it('should expose relationship attributes in player sync data', () => {
      const map = new mapUtils.Map(config);
      const player = new playerUtils.Player('player-1');
      player.init({ x: 250, y: 250 }, config.defaultPlayerMass);
      player.clientProvidedData({
        name: 'tester',
        screenWidth: 800,
        screenHeight: 600
      });
      relationship.applyConnectionOutcome(player, player, connection.STATES.RESONATING);
      map.players.pushNew(player);

      let result;
      map.enumerateWhatPlayersSee((playerData) => {
        result = playerData;
      });

      expect(result.intimacy).to.equal(relationshipConfig.resonatingDelta.intimacy * 2);
      expect(result.spike).to.equal(relationshipConfig.resonatingDelta.spike * 2);
      expect(result.pollution).to.equal(relationshipConfig.resonatingDelta.pollution * 2);
    });
  });
});
