/*jshint expr:true */

'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const os = require('os');
const path = require('path');

const GhostManager = require('../../apps/server/src/ghost/manager');
const GhostRecorder = require('../../apps/server/src/ghost/recorder');
const baseConfig = require('../../configs/game/config');
const mapUtils = require('../../apps/server/src/map/map');

function loadStore(dbPath) {
  delete require.cache[require.resolve('../../apps/server/src/memory/store')];
  process.env.MEMORY_DB_PATH = dbPath;
  return require('../../apps/server/src/memory/store');
}

describe('historical echo persistence integration', function () {
  let tmpDir;
  let previousMemoryPath;

  beforeEach(function () {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agar-echo-persistence-'));
    previousMemoryPath = process.env.MEMORY_DB_PATH;
  });

  afterEach(function () {
    if (previousMemoryPath === undefined) {
      delete process.env.MEMORY_DB_PATH;
    } else {
      process.env.MEMORY_DB_PATH = previousMemoryPath;
    }
    delete require.cache[require.resolve('../../apps/server/src/memory/store')];
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('should replay a recorded session from sqlite into active ghosts and ghost echo loot', function () {
    const store = loadStore(path.join(tmpDir, 'memory.sqlite3'));
    const recorder = new GhostRecorder({
      sessionId: 'old-session',
      startedAt: 1000,
      mapId: 'fixed-arena',
      memoryStore: store,
      recordPlayerTraces: true
    });
    const oldPlayer = {
      id: 'old-player',
      name: 'Past Alice',
      x: 300,
      y: 300,
      massTotal: 32,
      cells: [{radius: 18}],
      bodyParts: [],
      consentToRecord: true,
      isReplayAllowed: true
    };

    recorder.recordPlayerSession(oldPlayer, 1000);
    recorder.recordPlayers([oldPlayer], 1000);
    oldPlayer.x = 330;
    oldPlayer.y = 315;
    recorder.recordPlayers([oldPlayer], 1600);
    recorder.recordPartEvent(oldPlayer, 'part_pickup', {
      type: 'HAND',
      templateId: 'hand-thread'
    }, {
      x: 330,
      y: 315
    }, 1600);

    const map = new mapUtils.Map(Object.assign({}, baseConfig, {
      partLoot: Object.assign({}, baseConfig.partLoot, {
        enabled: false
      })
    }));
    const ghostManager = new GhostManager({
      memoryStore: store,
      mapId: 'fixed-arena',
      triggerRadius: 100,
      timeWindowMs: 1000,
      anchorCooldownMs: 10000,
      followTimeoutMs: 10000,
      eventRefreshIntervalMs: 0
    });

    ghostManager.tick({
      map,
      players: [{
        id: 'live-player',
        isNpc: false,
        x: 330,
        y: 315
      }],
      matchStartedAt: 1000,
      now: 1600
    });
    ghostManager.tick({
      map,
      players: [{
        id: 'live-player',
        isNpc: false,
        x: 330,
        y: 315
      }],
      matchStartedAt: 1000,
      now: 1601
    });

    expect(map.ghosts).to.have.length(1);
    expect(map.ghosts[0]).to.include({
      sessionId: 'old-session',
      ghostId: 'old-player',
      name: 'Past Alice'
    });
    expect(map.partLoot.data).to.have.length(1);
    expect(map.partLoot.data[0].part).to.include({
      sourceType: 'ghost_echo',
      ghostSessionId: 'old-session',
      ghostPlayerId: 'old-player'
    });
  });
});
