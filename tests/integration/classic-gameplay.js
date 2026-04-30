/*jshint expr:true */

const expect = require('chai').expect;
const baseConfig = require('../../configs/game/config');
const createGameLoopService = require('../../apps/server/src/game-loop-service');
const mapUtils = require('../../apps/server/src/map/map');
const playerUtils = require('../../apps/server/src/map/player');
const util = require('../../apps/server/src/lib/util');

function createTestConfig(overrides) {
  return Object.assign({}, baseConfig, {
    maxHeartbeatInterval: 60000,
    partLoot: Object.assign({}, baseConfig.partLoot, {
      enabled: false,
      maxWorldParts: 0,
      spawnBatch: 0
    }),
    demo: Object.assign({}, baseConfig.demo, {
      roundDurationMs: 600000
    })
  }, overrides || {});
}

function createPlayer(id, name, position, mass) {
  const player = new playerUtils.Player(id);

  player.init(position, mass);
  player.clientProvidedData({
    name,
    screenWidth: 800,
    screenHeight: 600
  });

  return player;
}

function createSocketRecorder() {
  const events = [];

  return {
    events,
    disconnected: false,
    emit(name, payload) {
      events.push({name, payload});
    },
    disconnect() {
      this.disconnected = true;
    }
  };
}

function createLoopHarness(config, map, socketsById) {
  const ioEvents = [];
  const clearTimerCalls = [];

  return {
    ioEvents,
    clearTimerCalls,
    service: createGameLoopService({
      config,
      map,
      io: {
        emit(name, payload) {
          ioEvents.push({name, payload});
        }
      },
      connectionService: {
        clearTimer(playerId) {
          clearTimerCalls.push(playerId);
        }
      },
      getSocket(playerId) {
        return socketsById && socketsById[playerId] ? socketsById[playerId] : null;
      },
      getSpectatorIds() {
        return [];
      }
    })
  };
}

describe('classic gameplay integration', () => {
  it('should consume food through the game-loop collision path', () => {
    const config = createTestConfig();
    const map = new mapUtils.Map(config);
    const player = createPlayer('player-food', 'forager', {x: 100, y: 100}, 50);
    const harness = createLoopHarness(config, map);

    map.players.pushNew(player);
    map.food.data.push({
      id: 'food-1',
      x: 100,
      y: 100,
      radius: util.massToRadius(config.foodMass),
      mass: config.foodMass
    });

    harness.service.tickPlayer(player);

    expect(map.food.data).to.have.length(0);
    expect(player.massTotal).to.equal(51);
  });

  it('should not let a player immediately eat the mass they just fired', () => {
    const config = createTestConfig();
    const map = new mapUtils.Map(config);
    const player = createPlayer('player-fire', 'spitter', {x: 200, y: 200}, 100);
    const harness = createLoopHarness(config, map);

    player.target = {x: 120, y: 0};
    map.players.pushNew(player);
    map.massFood.addNew(player, 0, config.fireFood);

    harness.service.tickPlayer(player);

    expect(map.massFood.data).to.have.length(1);
    expect(player.massTotal).to.equal(100);
  });

  it('should split a large player when they eat a virus', () => {
    const config = createTestConfig({
      limitSplit: 16
    });
    const map = new mapUtils.Map(config);
    const player = createPlayer('player-virus', 'splitter', {x: 300, y: 300}, 200);
    const harness = createLoopHarness(config, map);

    map.players.pushNew(player);
    map.viruses.data.push({
      id: 'virus-1',
      x: 300,
      y: 300,
      radius: util.massToRadius(20),
      mass: 20
    });

    harness.service.tickPlayer(player);

    expect(map.viruses.data).to.have.length(0);
    expect(player.cells.length).to.be.greaterThan(1);
    expect(player.cells.length).to.be.at.most(config.limitSplit);
  });

  it('should steal one part instead of removing a swallowed player', () => {
    const config = createTestConfig();
    const map = new mapUtils.Map(config);
    const eater = createPlayer('player-eater', 'Eater', {x: 400, y: 400}, 400);
    const victim = createPlayer('player-victim', 'Victim', {x: 400, y: 400}, 10);
    const victimSocket = createSocketRecorder();
    const harness = createLoopHarness(config, map, {
      'player-victim': victimSocket
    });

    map.players.pushNew(eater);
    map.players.pushNew(victim);

    harness.service.tickGame();

    expect(map.players.findByID('player-victim')).to.equal(victim);
    expect(eater.massTotal).to.equal(400);
    expect(eater.bodyPartCount).to.equal(7);
    expect(victim.bodyPartCount).to.equal(5);
    expect(harness.ioEvents.some((event) => event.name === 'playerDied')).to.equal(false);
    expect(victimSocket.events).to.have.length(0);
    expect(harness.clearTimerCalls).to.deep.equal([]);
  });
});
