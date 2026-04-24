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
});
