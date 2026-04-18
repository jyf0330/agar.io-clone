/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const connectionConfig = require('../../configs/game/connection');
const connection = require('../../apps/server/src/connection');
const body = require('../../apps/server/src/body');
const playerUtils = require('../../apps/server/src/map/player');

describe('connection.js', () => {
  describe('player defaults', () => {
    it('should initialize players with idle connection state', () => {
      const player = new playerUtils.Player('player-1');
      player.init({ x: 100, y: 100 }, config.defaultPlayerMass);

      expect(player.connectionStatus).to.equal(connection.STATES.IDLE);
      expect(player.connectionTargetId).to.equal(null);
      expect(player.connectionTargetName).to.equal(null);
    });
  });

  describe('findConnectionTarget', () => {
    it('should pick the nearest eligible player within range', () => {
      const actor = {
        id: 'actor',
        x: 0,
        y: 0,
        connectionStatus: connection.STATES.IDLE
      };
      const near = {
        id: 'near',
        x: 40,
        y: 0,
        name: 'near',
        connectionStatus: connection.STATES.IDLE
      };
      const far = {
        id: 'far',
        x: 140,
        y: 0,
        name: 'far',
        connectionStatus: connection.STATES.IDLE
      };

      const target = connection.findConnectionTarget(actor, [near, far], connectionConfig.attemptRange);

      expect(target.id).to.equal('near');
    });

    it('should ignore players outside range or already busy', () => {
      const actor = {
        id: 'actor',
        x: 0,
        y: 0,
        connectionStatus: connection.STATES.IDLE
      };
      const busy = {
        id: 'busy',
        x: 30,
        y: 0,
        name: 'busy',
        connectionStatus: connection.STATES.CHANNELING
      };
      const far = {
        id: 'far',
        x: connectionConfig.attemptRange + 10,
        y: 0,
        name: 'far',
        connectionStatus: connection.STATES.IDLE
      };

      const target = connection.findConnectionTarget(actor, [busy, far], connectionConfig.attemptRange);

      expect(target).to.equal(null);
    });

    it('should allow extra hands to extend connection range', () => {
      const actor = body.createBodyState([
        body.createBodyPart('HAND', 1),
        body.createBodyPart('HAND', 2)
      ]);
      actor.id = 'actor';
      actor.x = 0;
      actor.y = 0;
      actor.connectionStatus = connection.STATES.IDLE;

      const target = {
        id: 'far-but-reachable',
        x: connectionConfig.attemptRange + 20,
        y: 0,
        name: 'reachable',
        connectionStatus: connection.STATES.IDLE
      };

      const resolved = connection.findConnectionTarget(
        actor,
        [target],
        body.getConnectionRange(connectionConfig.attemptRange, actor)
      );

      expect(resolved.id).to.equal('far-but-reachable');
    });
  });

  describe('resolveConnectionOutcome', () => {
    it('should return resonance when players stay in range', () => {
      const actor = { x: 0, y: 0 };
      const target = { x: 60, y: 0 };

      expect(connection.resolveConnectionOutcome(actor, target, connectionConfig.attemptRange)).to.equal(connection.STATES.RESONATING);
    });

    it('should return break when players leave range', () => {
      const actor = { x: 0, y: 0 };
      const target = { x: connectionConfig.attemptRange + 20, y: 0 };

      expect(connection.resolveConnectionOutcome(actor, target, connectionConfig.attemptRange)).to.equal(connection.STATES.BREAK);
    });
  });
});
