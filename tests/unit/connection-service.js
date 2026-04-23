/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const connectionConfig = require('../../configs/game/connection');
const connection = require('../../apps/server/src/connection');
const createConnectionService = require('../../apps/server/src/connection-service');
const playerUtils = require('../../apps/server/src/map/player');

function createFakeScheduler() {
  let nextId = 1;
  let jobs = [];

  return {
    setTimeout(fn, delay) {
      const id = nextId++;
      jobs.push({ id, fn, delay });
      return id;
    },
    clearTimeout(id) {
      jobs = jobs.filter((job) => job.id !== id);
    },
    pendingDelays() {
      return jobs.map((job) => job.delay).sort((left, right) => left - right);
    },
    runAllWithDelay(delay) {
      const dueJobs = jobs.filter((job) => job.delay === delay);
      jobs = jobs.filter((job) => job.delay !== delay);
      dueJobs.forEach((job) => job.fn());
    }
  };
}

function createPlayer(id, name, x, y) {
  const player = new playerUtils.Player(id);
  player.init({ x: x, y: y }, config.defaultPlayerMass);
  player.name = name;
  player.x = x;
  player.y = y;
  return player;
}

describe('connection-service.js', () => {
  it('should drive channeling, resolution, and reset through the scheduler', () => {
    const scheduler = createFakeScheduler();
    const players = new playerUtils.PlayerManager();
    const actor = createPlayer('actor', 'actor', 0, 0);
    const target = createPlayer('target', 'target', 100, 0);
    const relationshipCalls = [];

    players.pushNew(actor);
    players.pushNew(target);

    const service = createConnectionService({
      players: players,
      relationship: {
        applyConnectionOutcome(left, right, outcome) {
          relationshipCalls.push({ left, right, outcome });
        }
      },
      scheduler: scheduler
    });

    expect(service.attemptConnection(actor)).to.equal(connection.STATES.CHANNELING);
    expect(actor.connectionStatus).to.equal(connection.STATES.CHANNELING);
    expect(actor.connectionTargetId).to.equal(target.id);
    expect(target.connectionStatus).to.equal(connection.STATES.CHANNELING);
    expect(target.connectionTargetId).to.equal(actor.id);
    expect(scheduler.pendingDelays()).to.deep.equal([
      connectionConfig.channelDurationMs,
      connectionConfig.channelDurationMs + connectionConfig.resonanceDurationMs,
      connectionConfig.channelDurationMs + connectionConfig.resonanceDurationMs
    ]);

    scheduler.runAllWithDelay(connectionConfig.channelDurationMs);

    expect(actor.connectionStatus).to.equal(connection.STATES.RESONATING);
    expect(target.connectionStatus).to.equal(connection.STATES.RESONATING);
    expect(relationshipCalls).to.have.lengthOf(1);
    expect(relationshipCalls[0].outcome).to.equal(connection.STATES.RESONATING);
    expect(scheduler.pendingDelays()).to.deep.equal([
      connectionConfig.resonanceDurationMs,
      connectionConfig.resonanceDurationMs
    ]);

    scheduler.runAllWithDelay(connectionConfig.resonanceDurationMs);

    expect(actor.connectionStatus).to.equal(connection.STATES.IDLE);
    expect(actor.connectionTargetId).to.equal(null);
    expect(target.connectionStatus).to.equal(connection.STATES.IDLE);
    expect(target.connectionTargetId).to.equal(null);
  });

  it('should apply a break state and reset when no eligible target is found', () => {
    const scheduler = createFakeScheduler();
    const players = new playerUtils.PlayerManager();
    const actor = createPlayer('actor', 'actor', 0, 0);
    const service = createConnectionService({
      players: players,
      scheduler: scheduler
    });

    players.pushNew(actor);

    expect(service.attemptConnection(actor)).to.equal(connection.STATES.BREAK);
    expect(actor.connectionStatus).to.equal(connection.STATES.BREAK);
    expect(scheduler.pendingDelays()).to.deep.equal([connectionConfig.breakDurationMs]);

    scheduler.runAllWithDelay(connectionConfig.breakDurationMs);

    expect(actor.connectionStatus).to.equal(connection.STATES.IDLE);
    expect(actor.connectionTargetId).to.equal(null);
  });
});
