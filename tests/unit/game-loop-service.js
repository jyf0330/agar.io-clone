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

  it('should record accepted pet suggestion when the suggested part is picked', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-1');
    const memoryEvents = [];
    const suggestion = {
      kind: 'pet_suggested_part',
      eventType: 'pet_suggested_part',
      playerId: 'player-1',
      npcId: 'mochi',
      sessionId: 'session-pickup',
      ts: 1700000000000 - 5000,
      payload: {
        suggestedPart: {
          partType: 'HAND',
          displayName: 'Thread Hand'
        }
      }
    };
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
        recordPartEvent() {}
      },
      memoryStore: {
        listEvents(filters) {
          if (filters.eventType === 'pet_suggested_part') {
            return [suggestion];
          }
          return [];
        },
        recordEvent(event) {
          memoryEvents.push(event);
        }
      },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000000000;
      service.tickPlayer(player);
    } finally {
      Date.now = originalNow;
    }

    expect(memoryEvents.some((event) => event.kind === 'player_picked_with_me')).to.equal(true);
    const accepted = memoryEvents.find((event) => event.kind === 'player_accepted_pet_suggestion');
    expect(accepted).to.include({
      eventType: 'player_accepted_pet_suggestion',
      playerId: 'player-1',
      npcId: 'mochi',
      sessionId: 'session-pickup',
      mapId: 'fixed-arena',
      x: 100,
      y: 100
    });
    expect(accepted.payload.suggestionEventId).to.equal(suggestion.eventId || '');
    expect(accepted.payload.partType).to.equal('HAND');
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

  it('should settle active human players when the round timer expires', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const playerA = new playerUtils.Player('player-a');
    const playerB = new playerUtils.Player('player-b');
    const npc = new playerUtils.Player('npc-mochi');
    const socketEvents = [];
    const clearedTimers = [];
    const roundEndedPlayers = [];
    const roundEndContexts = [];

    playerA.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    playerA.clientProvidedData({
      name: 'Alice',
      screenWidth: 800,
      screenHeight: 600
    });
    playerB.init({ x: 180, y: 160 }, config.defaultPlayerMass);
    playerB.clientProvidedData({
      name: 'Bob',
      screenWidth: 800,
      screenHeight: 600
    });
    npc.init({ x: 220, y: 220 }, config.defaultPlayerMass);
    npc.isNpc = true;
    npc.name = 'Mochi';
    map.players.pushNew(playerA);
    map.players.pushNew(playerB);
    map.players.pushNew(npc);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: {
        clearTimer(id) {
          clearedTimers.push(id);
        }
      },
      getRoundClock() {
        return {
          startedAt: 1700000000000,
          durationMs: 5000
        };
      },
      getSocket(id) {
        return {
          emit(name, payload) {
            socketEvents.push({id, name, payload});
          },
          disconnect() {}
        };
      },
      onRoundEnd(players, context) {
        players.forEach((player) => {
          roundEndedPlayers.push(player.id);
        });
        roundEndContexts.push(context);
      },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000006000;
      service.tickGame();
    } finally {
      Date.now = originalNow;
    }

    expect(socketEvents.filter((event) => event.name === 'settlement')).to.have.length(2);
    expect(socketEvents.filter((event) => event.name === 'RIP')).to.have.length(2);
    expect(roundEndedPlayers).to.deep.equal(['player-a', 'player-b']);
    expect(roundEndContexts[0]).to.include({
      endedReason: 'round_end',
      forceMemoryFinalize: true
    });
    expect(socketEvents.find((event) => event.id === 'player-a' && event.name === 'settlement').payload).to.include({
      endedReason: 'round_end',
      playerId: 'player-a',
      historyWritten: true
    });
    expect(clearedTimers).to.have.members(['player-a', 'player-b']);
    expect(map.players.findByID('player-a')).to.equal(null);
    expect(map.players.findByID('player-b')).to.equal(null);
    expect(map.players.findByID('npc-mochi')).to.not.equal(null);
  });

  it('should restart an expired idle round before settling the next player', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const roundClock = {
      startedAt: 1700000000000,
      durationMs: 5000
    };
    const socketEvents = [];
    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getRoundClock() {
        return roundClock;
      },
      getSocket(id) {
        return {
          emit(name, payload) {
            socketEvents.push({id, name, payload});
          }
        };
      },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000006000;
      service.tickGame();

      const player = new playerUtils.Player('late-player');
      player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
      player.clientProvidedData({
        name: 'Late',
        screenWidth: 800,
        screenHeight: 600
      });
      player.lastHeartbeat = new Date().getTime();
      map.players.pushNew(player);

      Date.now = () => 1700000007000;
      service.tickGame();
    } finally {
      Date.now = originalNow;
    }

    expect(roundClock.startedAt).to.equal(1700000006000);
    expect(socketEvents.filter((event) => event.name === 'settlement')).to.have.length(0);
    expect(socketEvents.filter((event) => event.name === 'RIP')).to.have.length(0);
    expect(map.players.findByID('late-player')).to.not.equal(null);
  });

  it('should settle all human players when one player reaches overreal body completion', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const winner = new playerUtils.Player('winner');
    const rival = new playerUtils.Player('rival');
    const socketEvents = [];
    const roundEndedPlayers = [];
    const roundEndContexts = [];

    winner.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    winner.clientProvidedData({
      name: 'Alice',
      screenWidth: 800,
      screenHeight: 600
    });
    body.applyBodyState(winner, {
      bodyParts: [
        body.createBodyPart('HEAD', 1),
        body.createBodyPart('HAND', 1),
        body.createBodyPart('FOOT', 1),
        body.createBodyPart('MOUTH', 1),
        body.createBodyPart('HEART', 1),
        body.createBodyPart('SPIKE', 1)
      ]
    });
    rival.init({ x: 240, y: 240 }, config.defaultPlayerMass);
    rival.clientProvidedData({
      name: 'Bob',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(winner);
    map.players.pushNew(rival);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getRoundClock() {
        return {
          startedAt: 1700000000000,
          durationMs: 90000
        };
      },
      onRoundEnd(players, context) {
        players.forEach((player) => {
          roundEndedPlayers.push(player.id);
        });
        roundEndContexts.push(context);
      },
      getSocket(id) {
        return {
          emit(name, payload) {
            socketEvents.push({id, name, payload});
          },
          disconnect() {}
        };
      },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000001000;
      service.tickGame();
    } finally {
      Date.now = originalNow;
    }

    const settlements = socketEvents.filter((event) => event.name === 'settlement');
    expect(settlements).to.have.length(2);
    expect(settlements.every((event) => event.payload.endedReason === 'body_complete')).to.equal(true);
    expect(settlements.every((event) => event.payload.winnerName === 'Alice')).to.equal(true);
    expect(roundEndedPlayers).to.deep.equal(['winner', 'rival']);
    expect(roundEndContexts[0]).to.include({
      endedReason: 'body_complete',
      winnerName: 'Alice',
      forceMemoryFinalize: true
    });
    expect(map.players.findByID('winner')).to.equal(null);
    expect(map.players.findByID('rival')).to.equal(null);
  });
});
