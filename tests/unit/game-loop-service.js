/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const createGameLoopService = require('../../apps/server/src/game-loop-service');
const body = require('../../apps/server/src/body');
const mapUtils = require('../../apps/server/src/map/map');
const playerUtils = require('../../apps/server/src/map/player');

describe('game-loop-service.js', () => {
  it('should keep the active pet following the player without creating a combat body', () => {
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'collector',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    service.tickPlayer(player);

    expect(player.activePet.active).to.equal(true);
    expect(player.activePet.x).to.be.a('number');
    expect(player.activePet.y).to.be.a('number');
    expect(player.activePet.radius).to.equal(18);
  });

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

  it('should record part lifecycle events when pickup replaces an equipped slot', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-1');
    const recorded = [];
    const memoryEvents = [];
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
      source: 'map-pickup'
    }, { x: 100, y: 100 }, 'map-pickup');

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      ghostRecorder: {
        sessionId: 'session-pickup',
        recordItem() {},
        recordPartEvent(playerArg, eventType, partArg, positionArg) {
          recorded.push({
            playerId: playerArg.id,
            eventType,
            partType: partArg.partType,
            x: positionArg.x,
            y: positionArg.y
          });
        }
      },
      memoryStore: {
        recordEvent(event) {
          memoryEvents.push(event);
        }
      },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    service.tickPlayer(player);

    expect(recorded.map((entry) => entry.eventType)).to.deep.equal([
      'part_pickup',
      'part_equipped',
      'part_replaced',
      'part_drop'
    ]);
    expect(recorded.every((entry) => entry.playerId === 'player-1')).to.equal(true);
    expect(recorded[0].partType).to.equal('HAND');
    expect(recorded[0].x).to.equal(100);
    expect(recorded[0].y).to.equal(100);
    expect(memoryEvents).to.have.length(1);
    expect(memoryEvents[0]).to.include({
      kind: 'player_picked_with_me',
      eventType: 'player_picked_with_me',
      playerId: 'player-1',
      npcId: 'mochi',
      sessionId: 'session-pickup',
      mapId: 'fixed-arena',
      x: 100,
      y: 100
    });
    expect(memoryEvents[0].payload.partType).to.equal('HAND');
  });

  it('should record combat and stolen part events when a player is fully eaten', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const eater = new playerUtils.Player('eater');
    const victim = new playerUtils.Player('victim');
    const recordedPartEvents = [];
    const recordedCombatEvents = [];
    const socketEvents = [];

    eater.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    eater.clientProvidedData({
      name: 'Eater',
      screenWidth: 800,
      screenHeight: 600
    });
    eater.cells[0].setMass(200);
    eater.massTotal = 200;

    victim.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    victim.clientProvidedData({
      name: 'Victim',
      screenWidth: 800,
      screenHeight: 600
    });
    body.applyBodyState(victim, {
      bodyParts: [
        body.createBodyPart('HAND', 1, {
          originPlayerId: 'victim',
          currentOwnerId: 'victim'
        })
      ]
    });

    map.players.pushNew(eater);
    map.players.pushNew(victim);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      ghostRecorder: {
        recordPartEvent(playerArg, eventType, partArg) {
          recordedPartEvents.push({
            playerId: playerArg.id,
            eventType,
            partType: partArg.partType,
            sourceType: partArg.sourceType
          });
        },
        recordCombatEvent(playerArg, eventType, targetArg) {
          recordedCombatEvents.push({
            playerId: playerArg.id,
            eventType,
            targetId: targetArg.id
          });
        }
      },
      getSocket(id) {
        if (id !== 'victim') {
          return null;
        }

        return {
          emit(name, payload) {
            socketEvents.push({name, payload});
          },
          disconnect() {}
        };
      },
      getSpectatorIds() { return []; }
    });

    service.tickGame();

    expect(recordedCombatEvents.map((entry) => entry.eventType)).to.deep.equal(['kill', 'swallowed']);
    expect(recordedPartEvents.map((entry) => entry.eventType)).to.deep.equal(['part_stolen', 'part_equipped']);
    expect(recordedPartEvents[0].partType).to.equal('HAND');
    expect(recordedPartEvents[0].sourceType).to.equal('kill_loot');
    expect(socketEvents.map((event) => event.name)).to.deep.equal(['settlement', 'RIP']);
    expect(socketEvents[0].payload.endedReason).to.equal('swallowed');
    expect(socketEvents[0].payload.historyWritten).to.equal(true);
    expect(map.players.findByID('victim')).to.equal(null);
  });
});
