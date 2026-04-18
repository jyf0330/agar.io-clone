/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const bodyConfig = require('../../configs/game/body');
const body = require('../../apps/server/src/body');
const entityUtils = require('../../apps/server/src/lib/entityUtils');
const playerUtils = require('../../apps/server/src/map/player');
const mapUtils = require('../../apps/server/src/map/map');

describe('body.js', () => {
  describe('player defaults', () => {
    it('should initialize players with the default starter body parts', () => {
      const player = new playerUtils.Player('player-1');
      player.init({ x: 100, y: 120 }, config.defaultPlayerMass);

      expect(player.bodyPartCount).to.equal(bodyConfig.defaultLoadout.length);
      expect(player.bodyParts.map((part) => part.type)).to.deep.equal(bodyConfig.defaultLoadout);
      expect(player.bodyPartCounts.HEAD).to.equal(1);
      expect(player.bodyPartCounts.HAND).to.equal(1);
      expect(player.bodyPartCounts.FOOT).to.equal(1);
      expect(player.bodyPartCounts.MOUTH).to.equal(1);
      expect(player.bodyPartCounts.HEART).to.equal(1);
      expect(player.bodyPartCounts.SPIKE).to.equal(0);
    });
  });

  describe('getStealableParts', () => {
    it('should only return core parts for default steal logic', () => {
      const bodyState = body.createBodyState([
        body.createBodyPart('HEAD', 1),
        body.createBodyPart('SPIKE', 1)
      ]);

      const stealable = body.getStealableParts(bodyState);

      expect(stealable.map((part) => part.type)).to.deep.equal(['HEAD']);
    });
  });

  describe('stealRandomCorePart', () => {
    it('should move one random core part from the loser to the eater', () => {
      const loser = body.createBodyState([
        body.createBodyPart('HEAD', 1),
        body.createBodyPart('HEART', 1),
        body.createBodyPart('SPIKE', 1)
      ]);
      const eater = body.createBodyState([
        body.createBodyPart('MOUTH', 1)
      ]);

      const stolen = body.stealRandomCorePart(loser, eater, () => 1);

      expect(stolen.type).to.equal('HEART');
      expect(loser.bodyPartCount).to.equal(2);
      expect(loser.bodyPartCounts.HEART).to.equal(0);
      expect(loser.bodyPartCounts.SPIKE).to.equal(1);
      expect(eater.bodyPartCount).to.equal(2);
      expect(eater.bodyPartCounts.HEART).to.equal(1);
      expect(eater.bodyParts.map((part) => part.type)).to.deep.equal(['MOUTH', 'HEART']);
    });

    it('should stay unchanged when there is no core part to steal', () => {
      const loser = body.createBodyState([
        body.createBodyPart('SPIKE', 1)
      ]);
      const eater = body.createBodyState([
        body.createBodyPart('HEAD', 1)
      ]);

      const stolen = body.stealRandomCorePart(loser, eater);

      expect(stolen).to.equal(null);
      expect(loser.bodyPartCount).to.equal(1);
      expect(eater.bodyPartCount).to.equal(1);
    });
  });

  describe('getPlayerDevourMassGain', () => {
    it('should grant bonus mass to players with extra mouths', () => {
      const eater = body.createBodyState([
        body.createBodyPart('MOUTH', 1),
        body.createBodyPart('MOUTH', 2)
      ]);

      const gainedMass = body.getPlayerDevourMassGain(20, eater);

      expect(gainedMass).to.equal(25);
    });

    it('should keep base mass gain when there is no extra mouth', () => {
      const eater = body.createBodyState([
        body.createBodyPart('MOUTH', 1)
      ]);

      const gainedMass = body.getPlayerDevourMassGain(20, eater);

      expect(gainedMass).to.equal(20);
    });
  });

  describe('movement and perception integration', () => {
    it('should move farther when a player has extra feet', () => {
      const defaultPlayer = new playerUtils.Player('default-player');
      defaultPlayer.init({ x: 100, y: 100 }, config.defaultPlayerMass);
      defaultPlayer.target = { x: 300, y: 0 };

      const fastPlayer = new playerUtils.Player('fast-player');
      fastPlayer.init({ x: 100, y: 100 }, config.defaultPlayerMass);
      body.applyBodyState(fastPlayer, {
        bodyParts: [
          body.createBodyPart('HEAD', 1),
          body.createBodyPart('HAND', 1),
          body.createBodyPart('FOOT', 1),
          body.createBodyPart('FOOT', 2),
          body.createBodyPart('MOUTH', 1),
          body.createBodyPart('HEART', 1)
        ]
      });
      fastPlayer.target = { x: 300, y: 0 };

      defaultPlayer.move(config.slowBase, config.gameWidth, config.gameHeight, 1);
      fastPlayer.move(config.slowBase, config.gameWidth, config.gameHeight, 1);

      expect(fastPlayer.x).to.be.greaterThan(defaultPlayer.x);
    });

    it('should see farther when a player has extra heads', () => {
      const viewer = new playerUtils.Player('viewer');
      viewer.init({ x: 200, y: 200 }, config.defaultPlayerMass);
      viewer.clientProvidedData({
        name: 'viewer',
        screenWidth: 200,
        screenHeight: 200
      });

      body.applyBodyState(viewer, {
        bodyParts: [
          body.createBodyPart('HEAD', 1),
          body.createBodyPart('HEAD', 2),
          body.createBodyPart('HAND', 1),
          body.createBodyPart('FOOT', 1),
          body.createBodyPart('MOUTH', 1),
          body.createBodyPart('HEART', 1)
        ]
      });

      const farEntity = {
        x: 360,
        y: 200,
        radius: 10
      };

      expect(entityUtils.isVisibleEntity(farEntity, viewer)).to.equal(true);
    });
  });

  describe('map synchronization payload', () => {
    it('should expose body part data in player sync payloads', () => {
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
      map.enumerateWhatPlayersSee((playerData, visiblePlayers) => {
        result = { playerData, visiblePlayers };
      });

      expect(result.playerData.bodyPartCount).to.equal(bodyConfig.defaultLoadout.length);
      expect(result.playerData.bodyPartCounts.HEART).to.equal(1);
      expect(result.playerData.bodyParts[0].type).to.equal('HEAD');
      expect(result.visiblePlayers[0].bodyPartCount).to.equal(bodyConfig.defaultLoadout.length);
      expect(result.visiblePlayers[0].bodyPartCounts.SPIKE).to.equal(0);
    });
  });
});
