/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const materializationConfig = require('../../configs/game/materialization');
const materialization = require('../../apps/server/src/materialization');
const playerUtils = require('../../apps/server/src/map/player');
const mapUtils = require('../../apps/server/src/map/map');
const {projectVisibleWorldForSync} = require('../../apps/server/src/player-projection');

describe('materialization.js', () => {
  describe('resolveMaterializationStage', () => {
    it('should resolve configured thresholds into the expected stages', () => {
      expect(materialization.resolveMaterializationStage(0)).to.equal('HOLLOW');
      expect(materialization.resolveMaterializationStage(materializationConfig.stageThresholds.HOLLOW.max)).to.equal('HOLLOW');
      expect(materialization.resolveMaterializationStage(materializationConfig.stageThresholds.PARTIAL.min)).to.equal('PARTIAL');
      expect(materialization.resolveMaterializationStage(materializationConfig.stageThresholds.PARTIAL.max)).to.equal('PARTIAL');
      expect(materialization.resolveMaterializationStage(materializationConfig.stageThresholds.REAL.min)).to.equal('REAL');
      expect(materialization.resolveMaterializationStage(materializationConfig.stageThresholds.REAL.max)).to.equal('REAL');
      expect(materialization.resolveMaterializationStage(materializationConfig.stageThresholds.OVERREAL.min)).to.equal('OVERREAL');
      expect(materialization.resolveMaterializationStage(999)).to.equal('OVERREAL');
    });
  });

  describe('player defaults', () => {
    it('should initialize players with materialization derived from equipped body parts', () => {
      const player = new playerUtils.Player('player-1');
      const expectedValue = materialization.resolveMaterializationFromBodyParts(player.bodyParts);
      const expectedStage = materialization.resolveMaterializationStage(expectedValue);

      expect(player.materialization).to.equal(expectedValue);
      expect(player.materializationStage).to.equal(expectedStage);

      player.init({ x: 100, y: 120 }, config.defaultPlayerMass);

      expect(player.materialization).to.equal(expectedValue);
      expect(player.materializationStage).to.equal(expectedStage);
    });

    it('should refresh materialization when body parts change', () => {
      const player = new playerUtils.Player('player-1');

      materialization.applyMaterializationState(player, 0);
      expect(player.materializationStage).to.equal(materialization.STAGES.HOLLOW);

      const body = require('../../apps/server/src/body');
      body.applyBodyState(player, {
        bodyParts: [
          body.createBodyPart('HEAD', 1),
          body.createBodyPart('HAND', 1),
          body.createBodyPart('FOOT', 1),
          body.createBodyPart('MOUTH', 1)
        ]
      });

      expect(player.materialization).to.equal(materialization.resolveMaterializationFromBodyParts(player.bodyParts));
      expect(player.materializationStage).to.equal(materialization.STAGES.REAL);
    });
  });

  describe('map synchronization payload', () => {
    it('should expose materialization fields in player sync data', () => {
      const map = new mapUtils.Map(config);
      const player = new playerUtils.Player('player-1');
      player.init({ x: 250, y: 250 }, config.defaultPlayerMass);
      player.clientProvidedData({
        name: 'tester',
        screenWidth: 800,
        screenHeight: 600
      });
      map.players.pushNew(player);

      let result;
      map.enumerateVisibleWorld((visibleWorld) => {
        result = projectVisibleWorldForSync(visibleWorld);
      });

      expect(result.playerData.materialization).to.equal(materialization.resolveMaterializationFromBodyParts(player.bodyParts));
      expect(result.playerData.materializationStage).to.equal(materialization.resolveMaterializationStage(result.playerData.materialization));
      expect(result.visiblePlayers[0].materialization).to.equal(materialization.resolveMaterializationFromBodyParts(player.bodyParts));
      expect(result.visiblePlayers[0].materializationStage).to.equal(materialization.resolveMaterializationStage(result.visiblePlayers[0].materialization));
    });
  });
});
