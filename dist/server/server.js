/*jslint bitwise: true, node: true */
'use strict';

try {
  require('dotenv').config({
    path: require('path').resolve(process.cwd(), '.env.local')
  });
} catch (error) {
  console.warn('[V3] dotenv not installed or .env.local missing; falling back to process.env only.');
}
const express = require('express');
const path = require('path');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const loggingRepositry = require('./repositories/logging-repository');
const chatRepository = require('./repositories/chat-repository');
const config = require(path.resolve(process.cwd(), 'config'));
const util = require('./lib/util');
const mapUtils = require('./map/map');
const {
  createPaintedAvatarDataUrl
} = require('./npc/avatar-paint');
const memoryStore = require('./memory/store');
const {
  summarizeSession
} = require('./memory/session-summarizer');
const {
  updatePersonaImpressions
} = require('./memory/persona-updater');
const NpcState = require('./npc/npc');
const Orchestrator = require('./npc/orchestrator');
const activePet = require('./npc/active-pet');
const taskRewards = require('./npc/task-rewards');
const returnMemory = require('./npc/return-memory');
const {
  loadPersonalityCard
} = require('./npc/personality-loader');
const {
  getPosition
} = require("./lib/entityUtils");
const createConnectionService = require('./connection-service');
const createGameLoopService = require('./game-loop-service');
const balanceTelemetryFactory = require('./balance/telemetry');
const settlement = require('./settlement');
const playerEntry = require('./player-entry');
const GhostManager = require('./ghost/manager');
const GhostRecorder = require('./ghost/recorder');
const memorySessionId = process.env.MEMORY_SESSION_ID || 'session-' + Date.now();
const npcFeaturesEnabled = !config.npc || config.npc.enabled !== false;
let map = new mapUtils.Map(config);
const roundClock = {
  startedAt: Date.now(),
  durationMs: config.demo && config.demo.roundDurationMs ? config.demo.roundDurationMs : 600000
};
const connectionService = createConnectionService({
  players: map.players
});
const ghostManager = new GhostManager({
  memoryStore: config.ghostEcho && config.ghostEcho.persistedHistory ? memoryStore : null,
  triggerRadius: config.ghostEcho && config.ghostEcho.triggerRadius,
  timeWindowMs: config.ghostEcho && config.ghostEcho.timeWindowMs,
  maxActiveGhosts: config.ghostEcho && config.ghostEcho.maxActiveGhosts,
  anchorCooldownMs: config.ghostEcho && config.ghostEcho.anchorCooldownMs,
  followTimeoutMs: config.ghostEcho && config.ghostEcho.followTimeoutMs,
  mapId: config.mapId || 'fixed-arena',
  debug: Boolean(config.ghostEcho && config.ghostEcho.debug || process.env.GHOST_DEBUG === '1'),
  eventRefreshIntervalMs: config.ghostEcho && config.ghostEcho.eventRefreshIntervalMs,
  seedEvents: [{
    id: 'seed-trace-hand',
    sessionId: 'seed-history',
    ghostId: 'seed-player',
    kind: 'trace',
    t: 8000,
    x: config.gameWidth / 2,
    y: config.gameHeight / 2,
    name: '历史回响'
  }, {
    id: 'seed-item-hand',
    sessionId: 'seed-history',
    ghostId: 'seed-player',
    kind: 'item',
    t: 9000,
    x: config.gameWidth / 2 + 80,
    y: config.gameHeight / 2,
    part: {
      type: 'HAND',
      templateId: 'hand-open',
      source: 'ghost-echo'
    }
  }]
});
const ghostRecorder = new GhostRecorder({
  memoryStore: memoryStore,
  sessionId: memorySessionId,
  startedAt: roundClock.startedAt,
  mapId: config.mapId || 'fixed-arena',
  recordPlayerTraces: Boolean(config.ghostEcho && config.ghostEcho.recordPlayerTraces),
  isSeed: process.env.V5_SEED_SESSION === '1'
});
const balanceTelemetry = balanceTelemetryFactory.createBalanceTelemetry({
  enabled: Boolean(config.balanceTelemetry && config.balanceTelemetry.enabled),
  sink(event) {
    try {
      balanceTelemetryFactory.appendJsonl(event);
    } catch (error) {
      console.warn('[BALANCE] telemetry write failed', error.message);
    }
  }
});
const gameLoopService = createGameLoopService({
  config,
  map,
  io,
  connectionService,
  ghostManager,
  ghostRecorder,
  memoryStore,
  balanceTelemetry,
  getRoundClock: () => roundClock,
  onRoundEnd(_players, context) {
    finalizeRoundMemoryIfNeeded({
      force: Boolean(context && context.forceMemoryFinalize)
    }).catch(error => {
      console.error('[NPC] round end memory finalizer failed', error);
    });
  },
  getSocket: id => sockets[id],
  getSpectatorIds: () => spectators.slice()
});
const orchestrator = new Orchestrator({
  maxCallsPerSec: 5,
  timeoutMs: 4000,
  mapWidth: config.gameWidth,
  mapHeight: config.gameHeight,
  mapId: config.mapId || 'fixed-arena',
  sessionId: memorySessionId,
  sessionStartedAt: Date.now(),
  roundDurationMs: roundClock.durationMs,
  memoryCacheTtlMs: config.npc && config.npc.memoryCacheTtlMs,
  recordLlmIntents: Boolean(config.npc && config.npc.recordLlmIntents),
  recordRoutineIntents: Boolean(config.npc && config.npc.recordRoutineIntents),
  routineIntentRecordIntervalMs: config.npc && config.npc.routineIntentRecordIntervalMs,
  useMemoryInRoutineTicks: Boolean(config.npc && config.npc.useMemoryInRoutineTicks),
  emitEvent(eventName, payload) {
    io.emit(eventName, payload);
  },
  recordEvent(event) {
    memoryStore.recordEvent(event);
  },
  memoryStore: memoryStore,
  paintPlayer(targetPlayer, npc) {
    targetPlayer.npcPaintCount = (targetPlayer.npcPaintCount || 0) + 1;
    targetPlayer.playerCardPreviewDataUrl = createPaintedAvatarDataUrl(targetPlayer.playerCardPreviewDataUrl, npc.color, targetPlayer.npcPaintCount);
    return targetPlayer.playerCardPreviewDataUrl;
  }
});
let npcRoster = [];
let npcsAnchoredToPlayer = false;
const chatState = {
  recentChats: [],
  lastPlayerAction: 'idle'
};
const roundMemorySummary = {
  started: false,
  done: false
};
const PET_CATALOG = {
  mochi: {
    petId: 'mochi',
    npcId: 'mochi',
    name: 'Mochi',
    personality: '安静诗意'
  },
  doudou: {
    petId: 'doudou',
    npcId: 'doudou',
    name: 'Doudou',
    personality: '调皮捣蛋'
  },
  wugui: {
    petId: 'wugui',
    npcId: 'wugui',
    name: 'Wugui',
    personality: '老成稳重'
  }
};
const PET_ALIASES = {
  mochi: 'mochi',
  '麻薯': 'mochi',
  doudou: 'doudou',
  '豆豆': 'doudou',
  wugui: 'wugui',
  '乌龟': 'wugui'
};
const npcRelationshipCache = {};
let sockets = {};
let spectators = [];
app.use(express.static(path.join(__dirname, '../client')));
io.on('connection', function (socket) {
  let type = socket.handshake.query.type;
  console.log('User has connected: ', type);
  switch (type) {
    case 'player':
      addPlayer(socket);
      break;
    case 'spectator':
      addSpectator(socket);
      break;
    default:
      console.log('Unknown user type, not doing anything.');
  }
});
function generateSpawnpoint() {
  let radius = util.massToRadius(config.defaultPlayerMass);
  const humanPlayers = map.players.data.filter(player => !player.isNpc);
  if (!humanPlayers.length) {
    return {
      x: Math.round(config.gameWidth / 2),
      y: Math.round(config.gameHeight / 2)
    };
  }
  return getPosition(config.newPlayerInitialPosition === 'farthest', radius, humanPlayers);
}
function placeNpcNearPlayer(npc, currentPlayer, index) {
  if (!npc || !currentPlayer || !npc.player || !npc.player.cells || !npc.player.cells.length) {
    return;
  }
  const offsets = [{
    x: 220,
    y: 140
  }, {
    x: -180,
    y: 100
  }, {
    x: 60,
    y: -180
  }];
  const offset = offsets[index] || offsets[offsets.length - 1];
  const spawn = {
    x: Math.max(120, Math.min(config.gameWidth - 120, currentPlayer.x + offset.x)),
    y: Math.max(120, Math.min(config.gameHeight - 120, currentPlayer.y + offset.y))
  };
  npc.player.cells.forEach(cell => {
    cell.x = spawn.x;
    cell.y = spawn.y;
  });
  npc.player.x = spawn.x;
  npc.player.y = spawn.y;
  npc.position = {
    x: spawn.x,
    y: spawn.y
  };
  npc.applyIntent({
    type: 'move_to',
    params: {
      x: spawn.x + 80,
      y: spawn.y + 30
    },
    reason: '靠近新玩家'
  });
  npc.move(0, config.gameWidth, config.gameHeight);
}
function bootstrapNpc(cardId, index) {
  const personality = loadPersonalityCard(path.resolve(process.cwd(), 'demo/npcs/personality-cards/' + cardId + '.yaml'));
  const offsets = [{
    x: 180,
    y: 120
  }, {
    x: -160,
    y: 90
  }, {
    x: 40,
    y: -170
  }];
  const offset = offsets[index] || {
    x: 0,
    y: 0
  };
  const npc = new NpcState({
    id: personality.id,
    personality: personality,
    spawn: {
      x: Math.round(config.gameWidth / 2 + offset.x),
      y: Math.round(config.gameHeight / 2 + offset.y)
    },
    defaultPlayerMass: config.defaultPlayerMass
  });
  npc.applyIntent({
    type: 'move_to',
    params: {
      x: npc.player.x + 60,
      y: npc.player.y + 20
    },
    reason: '初始巡游'
  });
  npc.move(0, config.gameWidth, config.gameHeight);
  orchestrator.registerNpc(npc);
  map.players.pushNew(npc.player);
  return npc;
}
function bootstrapDefaultNpcs() {
  return ['mochi', 'doudou', 'wugui'].map((cardId, index) => bootstrapNpc(cardId, index));
}

// V5 pets are part of the main demo path; set V5_NPC_ENABLED=0 to disable them locally.
if (npcFeaturesEnabled) {
  npcRoster = bootstrapDefaultNpcs();
}
function buildActivePetSnapshot(npc, ownerPlayerId, fallbackPetId) {
  if (!npc || !npc.player) {
    const fallback = PET_CATALOG[fallbackPetId] || PET_CATALOG.mochi;
    return Object.assign({}, fallback, {
      ownerPlayerId: ownerPlayerId
    });
  }
  return {
    petId: npc.id,
    npcId: npc.id,
    name: npc.player.name,
    personality: npc.personality && npc.personality.archetype ? npc.personality.archetype : '谨慎型',
    ownerPlayerId: ownerPlayerId
  };
}
function parsePetSwitchMessage(message) {
  const match = String(message || '').trim().match(/^(?:换宠|切换宠物|pet)\s*[:：]?\s*([a-zA-Z]+|[\u4e00-\u9fa5]+)/i);
  if (!match) {
    return null;
  }
  return PET_ALIASES[String(match[1]).toLowerCase()] || PET_ALIASES[match[1]] || null;
}
function ensureActivePetForPlayer(player) {
  if (!player || player.isNpc || typeof player.setActivePet !== 'function') {
    return;
  }
  const activeNpc = activePet.getActiveNpc(npcRoster, player);
  player.setActivePet(buildActivePetSnapshot(activeNpc, player.id));
}
function rememberRecentChat(currentPlayer, message) {
  const entry = {
    ts: Date.now(),
    playerId: currentPlayer.id,
    playerName: currentPlayer.name,
    message: String(message || '').slice(0, 35)
  };
  chatState.recentChats.push(entry);
  if (chatState.recentChats.length > 10) {
    chatState.recentChats = chatState.recentChats.slice(-10);
  }
  chatState.lastPlayerAction = 'chat:' + entry.message.slice(0, 20);
  try {
    memoryStore.recordEvent({
      kind: 'player_chat',
      playerId: entry.playerId,
      npcId: '',
      sessionId: memorySessionId,
      payload: {
        playerName: entry.playerName,
        message: entry.message
      },
      ts: entry.ts
    });
  } catch (error) {
    console.warn('[NPC] player chat memory write failed', error.message);
  }
  return entry;
}
function speakPreviousExpectations(currentPlayer) {
  const activeNpc = activePet.getActiveNpc(npcRoster, currentPlayer, {
    fallbackToFirst: false
  });
  if (!activeNpc) {
    return;
  }
  try {
    const latestSummary = memoryStore.listSessionSummaries({
      playerId: currentPlayer.id,
      npcId: activeNpc.id,
      limit: 1
    })[0];
    const text = returnMemory.buildReturnMemoryLine(latestSummary);
    if (!text) {
      return;
    }
    const now = Date.now();
    io.emit('npc:speak', {
      npcId: activeNpc.id,
      npcName: activeNpc.player.name,
      text: text,
      duration: 4000
    });
    memoryStore.recordEvent({
      eventId: ['l1', memorySessionId, currentPlayer.id, activeNpc.id, 'return_memory', now].join(':'),
      kind: 'chat_turn',
      eventType: 'chat_turn',
      playerId: currentPlayer.id,
      npcId: activeNpc.id,
      sessionId: memorySessionId,
      mapId: config.mapId || 'fixed-arena',
      x: currentPlayer.x,
      y: currentPlayer.y,
      payload: {
        answer: text,
        source: 'return_memory',
        referencedL1EventIds: latestSummary.referencedL1EventIds || []
      },
      ts: now,
      createdAt: now
    });
  } catch (error) {
    console.warn('[NPC] return memory recall failed', error.message);
  }
}
function refreshNpcRelationshipsForPlayers() {
  const humanPlayers = map.players.data.filter(player => !player.isNpc);
  const now = Date.now();
  const ttlMs = config.npc && typeof config.npc.relationshipCacheTtlMs === 'number' ? config.npc.relationshipCacheTtlMs : 10000;
  humanPlayers.forEach(player => {
    ensureActivePetForPlayer(player);
    player.npcRelationships = npcRoster.map(npc => {
      let relationshipValue = npc.personality && npc.personality.relationship_schema && typeof npc.personality.relationship_schema.init_value === 'number' ? npc.personality.relationship_schema.init_value : 0;
      const cacheKey = [player.id, npc.id].join(':');
      const cachedRelationship = npcRelationshipCache[cacheKey];
      if (cachedRelationship && now - cachedRelationship.loadedAt < ttlMs) {
        relationshipValue = cachedRelationship.relationshipValue;
        return {
          npcId: npc.id,
          npcName: npc.player.name,
          relationshipValue: relationshipValue
        };
      }
      try {
        const impression = memoryStore.getPersonaImpression(player.id, npc.id);
        if (impression && typeof impression.relationshipValue === 'number') {
          relationshipValue = impression.relationshipValue;
        }
        npcRelationshipCache[cacheKey] = {
          loadedAt: now,
          relationshipValue: relationshipValue
        };
      } catch (error) {
        console.warn('[NPC] relationship HUD refresh failed', error.message);
      }
      return {
        npcId: npc.id,
        npcName: npc.player.name,
        relationshipValue: relationshipValue
      };
    });
  });
}
async function finalizeRoundMemoryIfNeeded(options) {
  const settings = options || {};
  const elapsedMs = Date.now() - roundClock.startedAt;
  if (roundMemorySummary.done || roundMemorySummary.started || !settings.force && elapsedMs < roundClock.durationMs) {
    return;
  }
  const humanPlayer = map.players.data.find(player => !player.isNpc);
  if (!humanPlayer) {
    return;
  }
  roundMemorySummary.started = true;
  try {
    const summaries = await summarizeSession({
      npcs: npcRoster,
      playerId: humanPlayer.id,
      sessionId: memorySessionId
    });
    const impressions = await updatePersonaImpressions({
      npcs: npcRoster,
      playerId: humanPlayer.id
    });
    roundMemorySummary.done = true;
    const updatedCount = impressions.filter(entry => !entry.skipped).length;
    console.log('[NPC] wrote ' + summaries.length + ' session memory summaries; updated ' + updatedCount + ' persona impressions');
  } catch (error) {
    roundMemorySummary.started = false;
    console.error('[NPC] session memory summary failed', error);
  }
}
const addPlayer = socket => {
  var currentPlayer = new mapUtils.playerUtils.Player(socket.id);
  socket.on('gotit', function (clientPlayerData) {
    const entryPayload = playerEntry.normalizePlayerEntryPayload(clientPlayerData);
    console.log('[INFO] Player ' + entryPayload.name + ' connecting!');
    currentPlayer.init(generateSpawnpoint(), config.defaultPlayerMass);
    if (map.players.findIndexByID(socket.id) > -1) {
      console.log('[INFO] Player ID is already connected, kicking.');
      socket.disconnect();
    } else if (!util.validNick(entryPayload.name)) {
      socket.emit('kick', 'Invalid username.');
      socket.disconnect();
    } else {
      console.log('[INFO] Player ' + entryPayload.name + ' connected!');
      sockets[socket.id] = socket;
      currentPlayer.clientProvidedData(entryPayload);
      ensureActivePetForPlayer(currentPlayer);
      ghostRecorder.recordPlayerSession(currentPlayer, Date.now());
      map.players.pushNew(currentPlayer);
      if (npcRoster.length && !npcsAnchoredToPlayer) {
        npcRoster.forEach((npc, index) => {
          placeNpcNearPlayer(npc, currentPlayer, index);
        });
        npcsAnchoredToPlayer = true;
        speakPreviousExpectations(currentPlayer);
      }
      gameLoopService.sendMetaUpdates();
      io.emit('playerJoin', {
        name: currentPlayer.name
      });
      console.log('Total players: ' + map.players.data.length);
    }
  });
  socket.on('pingcheck', () => {
    socket.emit('pongcheck');
  });
  socket.on('windowResized', data => {
    currentPlayer.screenWidth = data.screenWidth;
    currentPlayer.screenHeight = data.screenHeight;
  });
  socket.on('respawn', () => {
    map.players.removePlayerByID(currentPlayer.id);
    socket.emit('welcome', currentPlayer, {
      width: config.gameWidth,
      height: config.gameHeight
    });
    console.log('[INFO] User ' + currentPlayer.name + ' has respawned');
  });
  socket.on('disconnect', () => {
    delete sockets[socket.id];
    if (typeof memoryStore.endSession === 'function') {
      memoryStore.endSession(memorySessionId, currentPlayer.id, Date.now());
    }
    npcsAnchoredToPlayer = false;
    connectionService.clearTimer(currentPlayer.id);
    map.players.removePlayerByID(currentPlayer.id);
    console.log('[INFO] User ' + currentPlayer.name + ' has disconnected');
    socket.broadcast.emit('playerDisconnect', {
      name: currentPlayer.name
    });
  });
  function handlePlayerChat(data) {
    const safeData = data || {};
    var _sender = String(safeData.sender || currentPlayer.name || '').replace(/(<([^>]+)>)/ig, '');
    var _message = String(safeData.message || '').replace(/(<([^>]+)>)/ig, '');
    if (_message === '') {
      return;
    }
    if (config.logChat === 1) {
      console.log('[CHAT] [' + new Date().getHours() + ':' + new Date().getMinutes() + '] ' + _sender + ': ' + _message);
    }
    if (config.demo && config.demo.enabled && settlement.isDemoSettlementRequest(_message)) {
      finalizeRoundMemoryIfNeeded({
        force: true
      }).catch(error => {
        console.error('[NPC] demo settlement memory finalizer failed', error);
      });
      socket.emit('settlement', settlement.buildSettlementSummary({
        player: currentPlayer,
        endedReason: 'demo_quick_end',
        recordingConsent: currentPlayer.consentToRecord !== false,
        historyWritten: currentPlayer.isReplayAllowed !== false
      }));
      socket.emit('RIP');
      connectionService.clearTimer(currentPlayer.id);
      map.players.removePlayerByID(currentPlayer.id);
      return;
    }
    const nextPetId = parsePetSwitchMessage(_message);
    if (nextPetId) {
      const oldPet = currentPlayer.activePet || null;
      const nextNpc = npcRoster.find(npc => npc.id === nextPetId);
      currentPlayer.setActivePet(buildActivePetSnapshot(nextNpc, currentPlayer.id, nextPetId));
      try {
        const now = Date.now();
        memoryStore.recordEvent({
          eventId: ['l1', memorySessionId, currentPlayer.id, currentPlayer.activePet.petId, 'pet_switched', now].join(':'),
          kind: 'pet_switched',
          eventType: 'pet_switched',
          playerId: currentPlayer.id,
          npcId: currentPlayer.activePet.petId,
          sessionId: memorySessionId,
          mapId: config.mapId || 'fixed-arena',
          x: currentPlayer.x,
          y: currentPlayer.y,
          payload: {
            oldPetId: oldPet && oldPet.petId ? oldPet.petId : null,
            newPetId: currentPlayer.activePet.petId,
            memoryKey: currentPlayer.activePet.memoryKey
          },
          ts: now,
          createdAt: now
        });
      } catch (error) {
        console.warn('[NPC] pet switch memory write failed', error.message);
      }
      socket.emit('npc:speak', {
        npcId: currentPlayer.activePet.petId,
        npcName: currentPlayer.activePet.name,
        text: '现在我跟着你。',
        duration: 2500
      });
      gameLoopService.sendMetaUpdates();
      ghostRecorder.recordChat(currentPlayer, _message, Date.now());
      return;
    }
    if (npcFeaturesEnabled) {
      rememberRecentChat(currentPlayer, _message);
      if (npcRoster.length && taskRewards.isTaskRewardRequest(_message)) {
        const activeNpc = activePet.getActiveNpc(npcRoster, currentPlayer);
        const reward = taskRewards.grantNpcTaskReward({
          map,
          player: currentPlayer,
          npc: activeNpc,
          memoryStore,
          sessionId: memorySessionId,
          mapId: config.mapId || 'fixed-arena'
        });
        if (!reward) {
          io.emit('npc:speak', {
            npcId: activeNpc.id,
            npcName: activeNpc.player.name,
            text: '先靠近我，这个任务才算交差。',
            duration: 3000
          });
          ghostRecorder.recordChat(currentPlayer, _message, Date.now());
          return;
        }
        io.emit('npc:speak', {
          npcId: activeNpc.id,
          npcName: activeNpc.player.name,
          text: '我把一个部位标在你脚边了。',
          duration: 3500
        });
        ghostRecorder.recordItem(currentPlayer, reward.part, reward.loot, Date.now());
        ghostRecorder.recordPartEvent(currentPlayer, 'npc_reward_part', reward.part, reward.loot, Date.now(), {
          taskId: 'find-echo-hand',
          npcId: activeNpc.id
        });
      }
    }
    ghostRecorder.recordChat(currentPlayer, _message, Date.now());
    socket.broadcast.emit('serverSendPlayerChat', {
      sender: currentPlayer.name,
      message: _message.substring(0, 35)
    });
    chatRepository.logChatMessage(_sender, _message, currentPlayer.ipAddress).catch(err => console.error("Error when attempting to log chat message", err));
  }
  socket.on('playerChat', handlePlayerChat);
  socket.on('player:chat', handlePlayerChat);
  socket.on('pass', async data => {
    const password = data[0];
    if (password === config.adminPass) {
      console.log('[ADMIN] ' + currentPlayer.name + ' just logged in as an admin.');
      socket.emit('serverMSG', 'Welcome back ' + currentPlayer.name);
      socket.broadcast.emit('serverMSG', currentPlayer.name + ' just logged in as an admin.');
      currentPlayer.admin = true;
    } else {
      console.log('[ADMIN] ' + currentPlayer.name + ' attempted to log in with the incorrect password: ' + password);
      socket.emit('serverMSG', 'Password incorrect, attempt logged.');
      loggingRepositry.logFailedLoginAttempt(currentPlayer.name, currentPlayer.ipAddress).catch(err => console.error("Error when attempting to log failed login attempt", err));
    }
  });
  socket.on('kick', data => {
    if (!currentPlayer.admin) {
      socket.emit('serverMSG', 'You are not permitted to use this command.');
      return;
    }
    var reason = '';
    var worked = false;
    for (let playerIndex in map.players.data) {
      let player = map.players.data[playerIndex];
      if (player.name === data[0] && !player.admin && !worked) {
        if (data.length > 1) {
          for (var f = 1; f < data.length; f++) {
            if (f === data.length) {
              reason = reason + data[f];
            } else {
              reason = reason + data[f] + ' ';
            }
          }
        }
        if (reason !== '') {
          console.log('[ADMIN] User ' + player.name + ' kicked successfully by ' + currentPlayer.name + ' for reason ' + reason);
        } else {
          console.log('[ADMIN] User ' + player.name + ' kicked successfully by ' + currentPlayer.name);
        }
        socket.emit('serverMSG', 'User ' + player.name + ' was kicked by ' + currentPlayer.name);
        sockets[player.id].emit('kick', reason);
        sockets[player.id].disconnect();
        map.players.removePlayerByIndex(playerIndex);
        worked = true;
      }
    }
    if (!worked) {
      socket.emit('serverMSG', 'Could not locate user or user is an admin.');
    }
  });

  // Heartbeat function, update everytime.
  socket.on('0', target => {
    currentPlayer.lastHeartbeat = new Date().getTime();
    if (target.x !== currentPlayer.x || target.y !== currentPlayer.y) {
      currentPlayer.target = target;
    }
  });
  socket.on('1', function () {
    // Fire food.
    const minCellMass = config.defaultPlayerMass + config.fireFood;
    for (let i = 0; i < currentPlayer.cells.length; i++) {
      if (currentPlayer.cells[i].mass >= minCellMass) {
        currentPlayer.changeCellMass(i, -config.fireFood);
        map.massFood.addNew(currentPlayer, i, config.fireFood);
      }
    }
  });
  socket.on('2', () => {
    currentPlayer.userSplit(config.limitSplit, config.defaultPlayerMass);
  });
  socket.on('3', () => {
    connectionService.attemptConnection(currentPlayer);
  });
};
const addSpectator = socket => {
  socket.on('gotit', function () {
    sockets[socket.id] = socket;
    spectators.push(socket.id);
    io.emit('playerJoin', {
      name: ''
    });
  });
  socket.on('disconnect', function () {
    delete sockets[socket.id];
    spectators = spectators.filter(spectatorId => spectatorId !== socket.id);
  });
  socket.emit("welcome", {}, {
    width: config.gameWidth,
    height: config.gameHeight
  });
};
setInterval(gameLoopService.tickGame, 1000 / 60);
setInterval(gameLoopService.gameloop, 1000);
if (npcFeaturesEnabled) {
  setInterval(() => {
    orchestrator.tick({
      players: map.players.data,
      mapWidth: config.gameWidth,
      mapHeight: config.gameHeight,
      partLoot: map.partLoot.data,
      partLootConfig: config.partLoot,
      ghostDebug: map.ghostDebug,
      mapId: config.mapId || 'fixed-arena',
      matchStartedAt: roundClock.startedAt,
      roundDurationMs: roundClock.durationMs,
      sessionId: memorySessionId,
      recentChats: chatState.recentChats,
      lastPlayerAction: chatState.lastPlayerAction
    }, 1000).catch(error => {
      console.error('[NPC] orchestrator tick failed', error);
    });
  }, config.npc && config.npc.tickIntervalMs ? config.npc.tickIntervalMs : 2000);
  setInterval(() => {
    finalizeRoundMemoryIfNeeded().catch(error => {
      console.error('[NPC] session memory finalizer failed', error);
    });
  }, config.npc && config.npc.memoryFinalizeIntervalMs ? config.npc.memoryFinalizeIntervalMs : 5000);
  setInterval(refreshNpcRelationshipsForPlayers, config.npc && config.npc.relationshipRefreshIntervalMs ? config.npc.relationshipRefreshIntervalMs : 10000);
}
setInterval(gameLoopService.sendMetaUpdates, config.sync && config.sync.playerMetaUpdateIntervalMs ? config.sync.playerMetaUpdateIntervalMs : 2000);
setInterval(gameLoopService.sendUpdates, 1000 / config.networkUpdateFactor);

// Don't touch, IP configurations.
var ipaddress = process.env.OPENSHIFT_NODEJS_IP || process.env.IP || config.host;
var serverport = process.env.OPENSHIFT_NODEJS_PORT || process.env.PORT || config.port;
http.listen(serverport, ipaddress, () => console.log('[DEBUG] Listening on ' + ipaddress + ':' + serverport));