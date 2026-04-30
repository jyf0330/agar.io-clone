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

    const hand = player.bodyParts.find((part) => part.templateId === 'hand-thread');
    expect(hand.templateId).to.equal('hand-thread');
    expect(hand.source).to.equal('ghost-echo');
    expect(player.bodyPartCounts.HAND).to.equal(3);
    expect(map.partLoot.data).to.have.length(0);
  });

  it('should not end the round when a default player collects one extra part', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-1');
    const socketEvents = [];

    player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'collector',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);
    map.partLoot.addPart({
      type: 'HEAD',
      templateId: 'head-default',
      source: 'map-pickup'
    }, { x: 100, y: 100 }, 'map-pickup');

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() {
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

    expect(player.bodyPartCounts.HEAD).to.equal(2);
    expect(socketEvents.filter((event) => event.name === 'settlement' || event.name === 'RIP')).to.have.length(0);
    expect(map.players.findByID('player-1')).to.equal(player);
  });

  it('should record part lifecycle events when pickup adds to the inventory', () => {
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
      'part_equipped'
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

  it('should steal one body part without killing the devoured player', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const eater = new playerUtils.Player('eater');
    const victim = new playerUtils.Player('victim');
    const recordedPartEvents = [];
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

    try {
      Date.now = () => 1700000000000;
      service.tickGame();
    } finally {
      Date.now = originalNow;
    }

    expect(recordedPartEvents.map((entry) => entry.eventType)).to.deep.equal(['part_stolen', 'part_equipped']);
    expect(recordedPartEvents[0].partType).to.equal('HAND');
    expect(recordedPartEvents[0].sourceType).to.equal('kill_loot');
    expect(socketEvents).to.have.length(0);
    expect(map.players.findByID('victim')).to.equal(victim);
    expect(victim.bodyPartCounts.HAND).to.equal(0);
    expect(eater.bodyPartCounts.HAND).to.equal(3);
    expect(victim.invincibleUntil).to.equal(1700000003000);
    expect(victim.speedBoostUntil).to.equal(1700000003000);
  });

  it('should protect the devoured player from other eaters after one part is stolen in the same tick', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const eaterA = new playerUtils.Player('eater-a');
    const eaterB = new playerUtils.Player('eater-b');
    const victim = new playerUtils.Player('victim');

    [eaterA, eaterB].forEach((eater) => {
      eater.init({ x: 100, y: 100 }, config.defaultPlayerMass);
      eater.clientProvidedData({
        name: eater.id,
        screenWidth: 800,
        screenHeight: 600
      });
      eater.cells[0].setMass(200);
      eater.massTotal = 200;
    });

    victim.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    victim.clientProvidedData({
      name: 'Victim',
      screenWidth: 800,
      screenHeight: 600
    });
    body.applyBodyState(victim, {
      bodyParts: [
        body.createBodyPart('HEAD', 1),
        body.createBodyPart('HAND', 1)
      ]
    });

    map.players.pushNew(eaterA);
    map.players.pushNew(eaterB);
    map.players.pushNew(victim);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000000000;
      service.tickGame();
    } finally {
      Date.now = originalNow;
    }

    expect(victim.bodyPartCount).to.equal(1);
    expect(victim.invincibleUntil).to.equal(1700000003000);
    expect(eaterA.bodyPartCount + eaterB.bodyPartCount).to.equal(13);
  });

  it('should let human players steal one npc robot part without removing the npc', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const eater = new playerUtils.Player('eater');
    const npc = new playerUtils.Player('npc-robot');

    eater.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    eater.clientProvidedData({
      name: 'Eater',
      screenWidth: 800,
      screenHeight: 600
    });
    eater.cells[0].setMass(200);
    eater.massTotal = 200;

    npc.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    npc.isNpc = true;
    npc.name = 'Robot';

    map.players.pushNew(eater);
    map.players.pushNew(npc);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000000000;
      service.tickGame();
    } finally {
      Date.now = originalNow;
    }

    expect(map.players.findByID('npc-robot')).to.equal(npc);
    expect(map.players.findByID('eater')).to.equal(eater);
    expect(npc.bodyPartCount).to.equal(5);
    expect(eater.bodyPartCount).to.equal(7);
    expect(eater.invincibleUntil).to.equal(0);
  });

  it('should let npc robots steal one player part', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const npc = new playerUtils.Player('npc-robot');
    const victim = new playerUtils.Player('victim');

    npc.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    npc.isNpc = true;
    npc.name = 'Robot';
    npc.cells[0].setMass(200);
    npc.massTotal = 200;

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

    map.players.pushNew(npc);
    map.players.pushNew(victim);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    service.tickGame();

    expect(map.players.findByID('victim')).to.equal(victim);
    expect(victim.bodyPartCounts.HAND).to.equal(0);
    expect(npc.bodyPartCount).to.equal(7);
  });

  it('should give the devoured player invincibility when there is no part to steal', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const eater = new playerUtils.Player('eater');
    const victim = new playerUtils.Player('victim');

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
      bodyParts: []
    });

    map.players.pushNew(eater);
    map.players.pushNew(victim);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000000000;
      service.tickGame();
    } finally {
      Date.now = originalNow;
    }

    expect(map.players.findByID('victim')).to.equal(victim);
    expect(victim.invincibleUntil).to.equal(1700000003000);
    expect(victim.speedBoostUntil).to.equal(1700000003000);
    expect(eater.invincibleUntil).to.equal(0);
  });

  it('should steal at most one part from the same target per tick', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const eater = new playerUtils.Player('eater');
    const victim = new playerUtils.Player('victim');

    eater.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    eater.clientProvidedData({
      name: 'Eater',
      screenWidth: 800,
      screenHeight: 600
    });
    eater.cells[0].setMass(400);
    eater.massTotal = 400;
    eater.splitCell(0, 2, config.defaultPlayerMass);
    eater.cells.forEach((cell) => {
      cell.x = 100;
      cell.y = 100;
      cell.speed = 0;
    });

    victim.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    victim.clientProvidedData({
      name: 'Victim',
      screenWidth: 800,
      screenHeight: 600
    });
    body.applyBodyState(victim, {
      bodyParts: [
        body.createBodyPart('HEAD', 1),
        body.createBodyPart('HAND', 1)
      ]
    });

    map.players.pushNew(eater);
    map.players.pushNew(victim);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    service.tickGame();

    expect(victim.bodyPartCount).to.equal(1);
    expect(eater.bodyPartCount).to.equal(7);
  });

  it('should only allow movement while invincible', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-boosted');
    const victim = new playerUtils.Player('victim');

    player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'Boosted',
      screenWidth: 800,
      screenHeight: 600
    });
    player.cells[0].setMass(200);
    player.massTotal = 200;
    player.target = { x: 200, y: 0 };
    player.invincibleUntil = 1700000003000;
    player.speedBoostUntil = 1700000003000;
    player.speedBoostMultiplier = 2;

    victim.init({ x: 150, y: 100 }, config.defaultPlayerMass);
    victim.clientProvidedData({
      name: 'Victim',
      screenWidth: 800,
      screenHeight: 600
    });

    map.players.pushNew(player);
    map.players.pushNew(victim);
    map.food.data.push({id: 'food-1', x: 100, y: 100, radius: 4});
    map.massFood.data.push({id: 'mass-1', x: 100, y: 100, mass: 5, radius: 5, speed: 0});
    map.viruses.data.push({id: 'virus-1', x: 100, y: 100, mass: 15, radius: 10});
    map.partLoot.addPart({
      type: 'HAND',
      templateId: 'hand-boosted',
      source: 'map-pickup'
    }, { x: 80, y: 100 }, 'map-pickup');

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000001000;
      service.tickGame();
    } finally {
      Date.now = originalNow;
    }

    expect(player.x).to.be.greaterThan(100);
    expect(player.massTotal).to.equal(200);
    expect(map.food.data).to.have.length(1);
    expect(map.massFood.data).to.have.length(1);
    expect(map.viruses.data).to.have.length(1);
    expect(map.partLoot.data).to.have.length(1);
    expect(map.players.findByID('victim')).to.equal(victim);
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

  it('should include authoritative round timer data in player sync updates', () => {
    const originalNow = Date.now;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-timer');
    const socketEvents = [];

    player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'Timer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getRoundClock() {
        return {
          startedAt: 1700000000000,
          durationMs: 600000
        };
      },
      getSocket() {
        return {
          emit(name, playerData) {
            socketEvents.push({name, playerData});
          }
        };
      },
      getSpectatorIds() { return []; }
    });

    try {
      Date.now = () => 1700000001000;
      service.sendUpdates();
    } finally {
      Date.now = originalNow;
    }

    const moveEvent = socketEvents.find((event) => event.name === 'serverTellPlayerMove');
    expect(moveEvent.playerData.roundTimer).to.deep.equal({
      startedAt: 1700000000000,
      durationMs: 600000,
      elapsedMs: 1000,
      remainingMs: 599000
    });
  });

  it('should publish cold player metadata outside the movement snapshot', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-meta');
    const ioEvents = [];

    player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'Meta',
      screenWidth: 800,
      screenHeight: 600,
      playerCardPreviewDataUrl: 'data:image/png;base64,card'
    });
    map.players.pushNew(player);

    const service = createGameLoopService({
      config,
      map,
      io: {
        emit(name, payload) {
          ioEvents.push({name, payload});
        }
      },
      connectionService: { clearTimer() {} },
      getSocket() { return null; },
      getSpectatorIds() { return []; }
    });

    service.sendMetaUpdates();

    expect(ioEvents[0].name).to.equal('playerMetaUpdate');
    expect(ioEvents[0].payload[0]).to.include({
      id: 'player-meta',
      name: 'Meta',
      playerCardPreviewDataUrl: 'data:image/png;base64,card'
    });
    expect(ioEvents[0].payload[0].cells).to.equal(undefined);
  });

  it('should keep movement snapshots free of cold player metadata', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-hot');
    const socketEvents = [];

    player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'Hot',
      screenWidth: 800,
      screenHeight: 600,
      playerCardPreviewDataUrl: 'data:image/png;base64,card'
    });
    map.players.pushNew(player);

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() {
        return {
          emit(name, playerData, users) {
            socketEvents.push({name, playerData, users});
          }
        };
      },
      getSpectatorIds() { return []; }
    });

    service.sendUpdates();

    const moveEvent = socketEvents.find((event) => event.name === 'serverTellPlayerMove');
    expect(moveEvent.playerData.cells[0].x).to.equal(100);
    expect(moveEvent.playerData.playerCardPreviewDataUrl).to.equal(undefined);
    expect(moveEvent.playerData.bodyParts).to.equal(undefined);
    expect(moveEvent.users[0].playerCardPreviewDataUrl).to.equal(undefined);
    expect(moveEvent.users[0].equipmentSlots).to.equal(undefined);
  });

  it('should keep serverTellPlayerMove argument order aligned with the client socket contract', () => {
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-sync-order');
    const socketEvents = [];

    player.init({ x: 100, y: 100 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'SyncOrder',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);
    map.food.data.push({id: 'food-1', x: 110, y: 110, radius: 4});
    map.massFood.data.push({id: 'mass-1', x: 120, y: 120, radius: 8});
    map.viruses.data.push({id: 'virus-1', x: 130, y: 130, radius: 16});
    map.partLoot.addPart({type: 'HAND', templateId: 'hand-order'}, {x: 140, y: 140}, 'map-pickup');
    map.ghosts.push({id: 'ghost-1', x: 150, y: 150, radius: 20});

    const service = createGameLoopService({
      config,
      map,
      io: { emit() {} },
      connectionService: { clearTimer() {} },
      getSocket() {
        return {
          emit() {
            socketEvents.push(Array.prototype.slice.call(arguments));
          }
        };
      },
      getSpectatorIds() { return []; }
    });

    service.sendUpdates();

    const eventArgs = socketEvents[0];
    expect(eventArgs[0]).to.equal('serverTellPlayerMove');
    expect(eventArgs[1].id).to.equal('player-sync-order');
    expect(eventArgs[2]).to.be.an('array');
    expect(eventArgs[3][0].id).to.equal('food-1');
    expect(eventArgs[4][0].id).to.equal('mass-1');
    expect(eventArgs[5][0].id).to.equal('virus-1');
    expect(eventArgs[6][0].part.templateId).to.equal('hand-order');
    expect(eventArgs[7][0].id).to.equal('ghost-1');
  });

  it('should settle all human players when one player completes a foreign body set', () => {
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
        body.createBodyPart('HAND', 1, {
          originPlayerId: 'winner',
          currentOwnerId: 'winner',
          sourceType: 'self_created'
        }),
        body.createBodyPart('HEAD', 1, { sourceType: 'map_pickup' }),
        body.createBodyPart('FOOT', 1, { sourceType: 'map_pickup' }),
        body.createBodyPart('MOUTH', 1, { sourceType: 'npc_reward' }),
        body.createBodyPart('HEART', 1, { sourceType: 'kill_loot' })
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
