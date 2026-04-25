/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const GhostManager = require('../../apps/server/src/ghost/manager');
const mapUtils = require('../../apps/server/src/map/map');
const playerUtils = require('../../apps/server/src/map/player');

describe('ghost manager', () => {
  it('should trigger visible ghosts and absolute-coordinate item drops from history', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 200, y: 200 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const manager = new GhostManager({
      triggerRadius: 160,
      triggerWindowMs: 250,
      seedEvents: [
        {
          id: 'trace-1',
          sessionId: 'old-session',
          ghostId: 'old-player',
          kind: 'trace',
          t: 1000,
          x: 205,
          y: 200,
          name: 'Past Huy'
        },
        {
          id: 'item-1',
          sessionId: 'old-session',
          ghostId: 'old-player',
          kind: 'item',
          t: 1000,
          x: 210,
          y: 202,
          part: {
            type: 'HAND',
            templateId: 'hand-open',
            source: 'ghost-echo'
          }
        }
      ]
    });

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });

    expect(map.ghosts).to.have.length(1);
    expect(map.ghosts[0].name).to.equal('Past Huy');
    expect(map.ghosts[0].x).to.equal(205);
    expect(map.partLoot.data).to.have.length(1);
    expect(map.partLoot.data[0].x).to.equal(210);
    expect(map.partLoot.data[0].part.templateId).to.equal('hand-open');
  });

  it('should respect V5 time window, active ghost cap, and anchor cooldown', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(Object.assign({}, config, {
      partLoot: {
        enabled: false
      }
    }));
    const player = new playerUtils.Player('player-1');
    player.init({ x: 200, y: 200 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const manager = new GhostManager({
      triggerRadius: 160,
      timeWindowMs: 250,
      maxActiveGhosts: 1,
      anchorCooldownMs: 60000,
      seedEvents: [
        {
          id: 'trace-1',
          sessionId: 'old-session-1',
          ghostId: 'old-player-1',
          kind: 'trace',
          t: 1000,
          x: 205,
          y: 200,
          name: 'Past One'
        },
        {
          id: 'trace-2',
          sessionId: 'old-session-2',
          ghostId: 'old-player-2',
          kind: 'trace',
          t: 1000,
          x: 206,
          y: 200,
          name: 'Past Two'
        }
      ]
    });

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });

    expect(map.ghosts).to.have.length(1);
    expect(map.ghosts[0].name).to.equal('Past One');

    manager.activeGhosts = {};
    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1100
    });

    expect(map.ghosts).to.have.length(0);

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 5000
    });

    expect(map.ghosts).to.have.length(0);
  });

  it('should use persisted ghost anchors as trigger sources when available', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 300, y: 300 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const manager = new GhostManager({
      triggerRadius: 100,
      timeWindowMs: 250,
      memoryStore: {
        listGhostAnchors() {
          return [{
            anchorId: 'anchor-1',
            sourceSessionId: 'old-session',
            sourcePlayerId: 'old-player',
            mapId: 'fixed-arena',
            t: 1000,
            x: 305,
            y: 300,
            eventType: 'part_pickup',
            priority: 50
          }];
        },
        listEvents() {
          return [];
        }
      }
    });

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });

    expect(map.ghosts).to.have.length(1);
    expect(map.ghosts[0].sessionId).to.equal('old-session');
    expect(map.ghosts[0].ghostId).to.equal('old-player');
    expect(map.ghosts[0].x).to.equal(305);
  });

  it('should only trigger persisted anchors for the current map id', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(Object.assign({}, config, {
      mapId: 'fixed-arena'
    }));
    const player = new playerUtils.Player('player-1');
    player.init({ x: 300, y: 300 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    let requestedMapId = null;
    const manager = new GhostManager({
      triggerRadius: 100,
      timeWindowMs: 250,
      memoryStore: {
        listGhostAnchors(filters) {
          requestedMapId = filters.mapId;
          return [
            {
              anchorId: 'other-anchor',
              sourceSessionId: 'other-session',
              sourcePlayerId: 'other-player',
              mapId: 'other-map',
              t: 1000,
              x: 305,
              y: 300,
              eventType: 'part_pickup',
              priority: 50
            },
            {
              anchorId: 'fixed-anchor',
              sourceSessionId: 'old-session',
              sourcePlayerId: 'old-player',
              mapId: 'fixed-arena',
              t: 1000,
              x: 306,
              y: 300,
              eventType: 'part_pickup',
              priority: 50
            }
          ];
        },
        listEvents() {
          return [];
        }
      }
    });

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });

    expect(requestedMapId).to.equal('fixed-arena');
    expect(map.ghosts).to.have.length(1);
    expect(map.ghosts[0].sessionId).to.equal('old-session');
  });

  it('should cache persisted trigger lookups during hot ticks', () => {
    let anchorLookups = 0;
    let eventLookups = 0;
    const manager = new GhostManager({
      mapId: 'fixed-arena',
      eventRefreshIntervalMs: 1000,
      memoryStore: {
        listGhostAnchors() {
          anchorLookups += 1;
          return [];
        },
        listEvents() {
          eventLookups += 1;
          return [];
        }
      }
    });

    manager.getEvents('fixed-arena', 1000);
    manager.getEvents('fixed-arena', 1200);
    manager.getEvents('fixed-arena', 2101);

    expect(anchorLookups).to.equal(2);
    expect(eventLookups).to.equal(6);
  });

  it('should replay persisted single-player trace points after an anchor activates', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 300, y: 300 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const manager = new GhostManager({
      triggerRadius: 100,
      timeWindowMs: 250,
      memoryStore: {
        listGhostAnchors() {
          return [{
            anchorId: 'anchor-1',
            sourceSessionId: 'old-session',
            sourcePlayerId: 'old-player',
            t: 1000,
            x: 305,
            y: 300,
            eventType: 'part_pickup',
            priority: 50
          }];
        },
        listPlayerTraces() {
          return [
            {sessionId: 'old-session', playerId: 'old-player', t: 1000, x: 305, y: 300},
            {sessionId: 'old-session', playerId: 'old-player', t: 1200, x: 345, y: 320}
          ];
        },
        listEvents() {
          return [];
        }
      }
    });

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });
    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1100
    });

    expect(map.ghosts).to.have.length(1);
    expect(map.ghosts[0].x).to.equal(325);
    expect(map.ghosts[0].y).to.equal(310);
  });

  it('should show persisted replay-allowed chat when the ghost reaches the original chat time', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 300, y: 300 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const manager = new GhostManager({
      triggerRadius: 100,
      timeWindowMs: 250,
      chatBubbleDurationMs: 4000,
      memoryStore: {
        listGhostAnchors() {
          return [{
            anchorId: 'anchor-1',
            sourceSessionId: 'old-session',
            sourcePlayerId: 'old-player',
            t: 1000,
            x: 305,
            y: 300,
            eventType: 'chat_message',
            priority: 20
          }];
        },
        listPlayerTraces() {
          return [
            {sessionId: 'old-session', playerId: 'old-player', t: 1000, x: 305, y: 300},
            {sessionId: 'old-session', playerId: 'old-player', t: 6000, x: 345, y: 320}
          ];
        },
        listChatRecords() {
          return [
            {sessionId: 'old-session', playerId: 'old-player', t: 900, text: 'too old', replayAllowed: true},
            {sessionId: 'old-session', playerId: 'old-player', t: 1100, text: 'old hello', replayAllowed: true},
            {sessionId: 'old-session', playerId: 'old-player', t: 1100, text: 'hidden', replayAllowed: false}
          ];
        },
        listEvents() {
          return [];
        }
      }
    });

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });

    expect(map.ghosts[0].chat).to.equal('');

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1100
    });

    expect(map.ghosts).to.have.length(1);
    expect(map.ghosts[0].chat).to.equal('old hello');

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 5200
    });

    expect(map.ghosts[0].chat).to.equal('');
  });

  it('should spawn ghost echo parts from historical pickup events at absolute coordinates', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 300, y: 300 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const manager = new GhostManager({
      triggerRadius: 100,
      timeWindowMs: 250,
      memoryStore: {
        listGhostAnchors() {
          return [{
            anchorId: 'anchor-1',
            sourceSessionId: 'old-session',
            sourcePlayerId: 'old-player',
            t: 1000,
            x: 305,
            y: 300,
            eventType: 'part_pickup',
            priority: 50
          }];
        },
        listPlayerTraces() {
          return [
            {sessionId: 'old-session', playerId: 'old-player', t: 1000, x: 305, y: 300},
            {sessionId: 'old-session', playerId: 'old-player', t: 1200, x: 345, y: 320}
          ];
        },
        listPartEvents() {
          return [{
            eventId: 'part-event-1',
            sessionId: 'old-session',
            playerId: 'old-player',
            eventType: 'part_pickup',
            t: 1100,
            x: 450,
            y: 460,
            payload: {
              part: {
                type: 'HAND',
                templateId: 'hand-open'
              }
            }
          }];
        },
        listEvents() {
          return [];
        }
      }
    });

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });

    expect(map.partLoot.data).to.have.length(0);

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1100
    });
    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1200
    });

    expect(map.partLoot.data).to.have.length(1);
    expect(map.partLoot.data[0].x).to.equal(450);
    expect(map.partLoot.data[0].y).to.equal(460);
    expect(map.partLoot.data[0].part.sourceType).to.equal('ghost_echo');
    expect(map.partLoot.data[0].part.ghostSessionId).to.equal('old-session');
    expect(map.partLoot.data[0].part.ghostEventId).to.equal('part-event-1');
  });

  it('should disperse active ghosts when players leave or the trace clip ends', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 300, y: 300 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const createManager = () => new GhostManager({
      triggerRadius: 100,
      activeRadius: 100,
      lonelyTimeoutMs: 500,
      clipGraceMs: 200,
      timeWindowMs: 250,
      memoryStore: {
        listGhostAnchors() {
          return [{
            anchorId: 'anchor-1',
            sourceSessionId: 'old-session',
            sourcePlayerId: 'old-player',
            t: 1000,
            x: 305,
            y: 300,
            eventType: 'part_pickup',
            priority: 50
          }];
        },
        listPlayerTraces() {
          return [
            {sessionId: 'old-session', playerId: 'old-player', t: 1000, x: 305, y: 300},
            {sessionId: 'old-session', playerId: 'old-player', t: 1200, x: 345, y: 320}
          ];
        },
        listEvents() {
          return [];
        }
      }
    });

    const lonelyManager = createManager();
    lonelyManager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });
    player.x = 1000;
    player.y = 1000;
    lonelyManager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1601
    });

    expect(map.ghosts).to.have.length(0);

    player.x = 300;
    player.y = 300;
    const endedManager = createManager();
    endedManager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });
    endedManager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1501
    });

    expect(map.ghosts).to.have.length(0);
  });

  it('should expose debug anchors and active clip counts when enabled', () => {
    const startedAt = 1000;
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 300, y: 300 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);

    const manager = new GhostManager({
      debug: true,
      triggerRadius: 100,
      timeWindowMs: 250,
      seedEvents: [{
        id: 'trace-1',
        sessionId: 'old-session',
        ghostId: 'old-player',
        kind: 'trace',
        t: 1000,
        x: 305,
        y: 300,
        name: 'Past One'
      }]
    });

    manager.tick({
      map,
      players: map.players.data,
      matchStartedAt: startedAt,
      now: startedAt + 1000
    });

    expect(map.ghostDebug.enabled).to.equal(true);
    expect(map.ghostDebug.activeGhostCount).to.equal(1);
    expect(map.ghostDebug.anchors).to.have.length(1);
    expect(map.ghostDebug.anchors[0].inTimeWindow).to.equal(true);
    expect(map.ghostDebug.clips[0]).to.include({
      id: 'old-session:old-player',
      clipStartT: 1000,
      clipEndT: 1000
    });
  });
});
