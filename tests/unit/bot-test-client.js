/*jshint expr:true */

const EventEmitter = require('events');
const expect = require('chai').expect;
const {SimulatedPlayerClient} = require('../../apps/bot-test/src/simulated-player-client');
const {BOT_STATES} = require('../../apps/bot-test/src/state-machine');

function createFakeSocket() {
  const socket = new EventEmitter();
  socket.emitted = [];
  socket.connected = true;
  socket.emit = function (eventName, ...payloads) {
    socket.emitted.push({
      eventName,
      payload: payloads[0],
      payloads
    });
    EventEmitter.prototype.emit.call(socket, eventName, ...payloads);
  };
  socket.disconnect = function () {
    socket.connected = false;
    EventEmitter.prototype.emit.call(socket, 'disconnect', 'io client disconnect');
  };
  return socket;
}

describe('simulated player client', () => {
  it('should follow the normal respawn -> welcome -> gotit player flow', async () => {
    const socket = createFakeSocket();
    const events = [];
    const client = new SimulatedPlayerClient({
      botId: 'Bot_01',
      roomId: 'room_001',
      serverUrl: 'http://game.local',
      random: () => 0,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      ioFactory(url, options) {
        expect(url).to.equal('http://game.local');
        expect(options.query.type).to.equal('player');
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-1'}, {width: 5000, height: 5000});

    const gotit = socket.emitted.find((entry) => entry.eventName === 'gotit');
    expect(socket.emitted.map((entry) => entry.eventName)).to.include('respawn');
    expect(gotit.payload.name).to.equal('Bot_01');
    expect(gotit.payload.isBot).to.equal(true);
    expect(gotit.payload.bodyAssembly.missingPartType).to.equal('hand_left');
    expect(gotit.payload.bodyAssembly.selectedOption.name).to.equal('藤蔓左手');
    expect(client.machine.state).to.equal(BOT_STATES.WaitingForPlayers);
    expect(events.find((entry) => entry.type === '连接服务器' && entry.message.indexOf('开始连接') === 0).data.socketType).to.equal('player');
    expect(events.find((entry) => entry.type === '连接服务器' && entry.message.indexOf('成功') === 0).data.socketType).to.equal('player');
    expect(events.map((entry) => entry.type)).to.include.members(['进入大厅', '请求开始游戏', '确认身体']);
    client.stop();
  });

  it('should move during battle and finish when settlement arrives', () => {
    const socket = createFakeSocket();
    const client = new SimulatedPlayerClient({
      botId: 'Bot_02',
      roomId: 'room_001',
      random: () => 0.2,
      logger: {
        bot() {},
        error() {}
      },
      movementIntervalMs: 100000,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-2'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-2', x: 100, y: 200, massTotal: 20}, [], [{x: 150, y: 220}], [], [], [], []);
    client.tickBattle();
    socket.emit('settlement', {endedReason: 'demo_quick_end'});

    const movementInputs = socket.emitted.filter((entry) => entry.eventName === '0');
    expect(movementInputs[movementInputs.length - 1].payload).to.deep.equal({x: 50, y: 20});
    expect(client.machine.state).to.equal(BOT_STATES.Finished);
    client.stop();
  });

  it('should keep sending normal player heartbeat before battle starts', () => {
    const socket = createFakeSocket();
    const client = new SimulatedPlayerClient({
      botId: 'Bot_03',
      roomId: 'room_001',
      random: () => 0.4,
      logger: {
        bot() {},
        error() {}
      },
      movementIntervalMs: 100000,
      heartbeatIntervalMs: 100000,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {
      id: 'socket-3',
      target: {x: 11, y: 22}
    }, {width: 5000, height: 5000});

    client.tickHeartbeat();

    const heartbeats = socket.emitted.filter((entry) => entry.eventName === '0');
    expect(client.machine.state).to.equal(BOT_STATES.WaitingForPlayers);
    expect(heartbeats.length).to.be.at.least(2);
    expect(heartbeats[0].payload).to.deep.equal({x: 11, y: 22});
    expect(heartbeats[heartbeats.length - 1].payload).to.deep.equal({x: 11, y: 22});
    client.stop();
  });

  it('should write readable battle behavior logs during movement and skills', () => {
    const socket = createFakeSocket();
    const events = [];
    let now = 1000;
    const client = new SimulatedPlayerClient({
      botId: 'Bot_04',
      roomId: 'room_001',
      random: () => 0.2,
      now: () => now,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      movementIntervalMs: 100000,
      skillCooldownMs: 3000,
      behaviorLogEveryTicks: 1,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-4'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-4', x: 100, y: 200, massTotal: 33}, [{id: 'other'}], [{x: 150, y: 220}], [], [], [{id: 'part'}], []);
    client.tickBattle();
    now += 3000;
    client.tickBattle();
    now += 3000;
    client.tickBattle();
    now += 3000;
    client.tickBattle();

    const behavior = events.find((entry) => entry.type === '战斗行为');
    const skillMessages = events.filter((entry) => entry.type === '战斗技能').map((entry) => entry.message);
    expect(behavior.message).to.equal('移动追资源');
    expect(behavior.data.targetSource).to.equal('可见食物');
    expect(behavior.data.visibleFood).to.equal(1);
    expect(behavior.data.visiblePlayers).to.equal(1);
    expect(behavior.data.visiblePartLoot).to.equal(1);
    expect(skillMessages).to.include('执行吐孢子');
    expect(skillMessages).to.include('执行分裂');
    expect(skillMessages).to.include('执行连接尝试');
    client.stop();
  });

  it('should send player chat for battle movement, skills, and ghost encounters', () => {
    const socket = createFakeSocket();
    let now = 1000;
    const client = new SimulatedPlayerClient({
      botId: 'Bot_Chat_All',
      roomId: 'room_001',
      random: () => 0.2,
      now: () => now,
      logger: {
        bot() {},
        error() {}
      },
      movementIntervalMs: 100000,
      skillCooldownMs: 1,
      behaviorLogEveryTicks: 1,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-chat-all'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-chat-all', x: 100, y: 200, massTotal: 33}, [], [{x: 150, y: 220}], [], [], [], [
      {id: 'ghost-1', x: 80, y: 90, name: 'Echo'}
    ]);
    now += 1;
    client.tickBattle();
    now += 1;
    client.tickBattle();
    now += 1;
    client.tickBattle();

    const messages = socket.emitted
      .filter((entry) => entry.eventName === 'playerChat')
      .map((entry) => entry.payload.message);
    client.stop();
    expect(messages).to.include.members([
      '我看到 ghost，正在绕开',
      '我去追食物',
      '我吐出孢子',
      '我分裂了',
      '我尝试连接'
    ]);
  });

  it('should cover the required human-like player operations during battle validation', () => {
    const socket = createFakeSocket();
    let now = 2000;
    const client = new SimulatedPlayerClient({
      botId: 'Bot_05',
      roomId: 'room_001',
      random: () => 0.2,
      now: () => now,
      logger: {
        bot() {},
        error() {}
      },
      movementIntervalMs: 100000,
      skillCooldownMs: 3000,
      behaviorLogEveryTicks: 1,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-5', massTotal: 30}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-5', x: 100, y: 200, massTotal: 33}, [], [{x: 150, y: 220}], [], [], [], []);
    client.tickBattle();
    now += 3000;
    client.tickBattle();
    now += 3000;
    client.tickBattle();
    now += 3000;
    client.tickBattle();

    const stats = client.getBehaviorStats();
    expect(stats.bodySelectionEvents).to.equal(1);
    expect(stats.syncEvents).to.equal(1);
    expect(stats.movementEvents).to.be.at.least(1);
    expect(stats.resourceTargetEvents + stats.randomCruiseEvents).to.be.at.least(1);
    expect(stats.ejectMassEvents).to.equal(1);
    expect(stats.splitEvents).to.equal(1);
    expect(stats.connectionAttemptEvents).to.equal(1);
    expect(stats.avoidanceEvents).to.equal(1);
    expect(stats.pursuitEvents).to.equal(1);
    expect(stats.chatEvents).to.be.at.least(7);
    expect(socket.emitted.some((entry) => entry.eventName === '0')).to.equal(true);
    expect(socket.emitted.some((entry) => entry.eventName === '1')).to.equal(true);
    expect(socket.emitted.some((entry) => entry.eventName === '2')).to.equal(true);
    expect(socket.emitted.some((entry) => entry.eventName === '3')).to.equal(true);
    expect(socket.emitted.filter((entry) => entry.eventName === 'playerChat').map((entry) => entry.payload.message)).to.include.members([
      '我去追食物',
      '我在巡游找目标',
      '我在躲大玩家',
      '我去追小玩家',
      '我吐出孢子',
      '我分裂了',
      '我尝试连接'
    ]);
    expect(socket.emitted.some((entry) => entry.eventName === 'playerChat' && entry.payload.message === '我吃到了食物，质量 +3')).to.equal(true);
    expect(socket.emitted.some((entry) => entry.eventName === 'playerChat' && entry.payload.message === '我去那边看看')).to.equal(false);
    client.stop();
  });

  it('should space skill operations by a multi-second cooldown', () => {
    const socket = createFakeSocket();
    let now = 3000;
    const client = new SimulatedPlayerClient({
      botId: 'Bot_06',
      roomId: 'room_001',
      random: () => 0.99,
      now: () => now,
      logger: {
        bot() {},
        error() {}
      },
      movementIntervalMs: 100000,
      skillCooldownMs: 3000,
      behaviorLogEveryTicks: 1,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-6'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-6', x: 100, y: 200, massTotal: 33}, [], [{x: 150, y: 220}], [], [], [], []);
    client.tickBattle();
    expect(socket.emitted.filter((entry) => ['1', '2', '3'].indexOf(entry.eventName) > -1)).to.have.length(0);

    now += 2999;
    client.tickBattle();
    expect(socket.emitted.filter((entry) => ['1', '2', '3'].indexOf(entry.eventName) > -1)).to.have.length(0);

    now += 1;
    client.tickBattle();
    expect(socket.emitted.filter((entry) => ['1', '2', '3'].indexOf(entry.eventName) > -1).map((entry) => entry.eventName)).to.deep.equal(['1']);

    now += 3000;
    client.tickBattle();
    expect(socket.emitted.filter((entry) => ['1', '2', '3'].indexOf(entry.eventName) > -1).map((entry) => entry.eventName)).to.deep.equal(['1', '2']);

    now += 3000;
    client.tickBattle();
    expect(socket.emitted.filter((entry) => ['1', '2', '3'].indexOf(entry.eventName) > -1).map((entry) => entry.eventName)).to.deep.equal(['1', '2', '3']);
    client.stop();
  });

  it('should pursue part loot and record ghost encounters as battle timeline events', () => {
    const socket = createFakeSocket();
    const events = [];
    const client = new SimulatedPlayerClient({
      botId: 'Bot_07',
      roomId: 'room_001',
      random: () => 0.4,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      movementIntervalMs: 100000,
      behaviorLogEveryTicks: 1,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-7'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-7', x: 100, y: 200, massTotal: 33}, [], [], [], [], [
      {id: 'loot-1', x: 340, y: 360, part: {partType: 'HAND', displayName: '藤蔓手'}}
    ], [
      {id: 'ghost-1', x: 80, y: 90, name: 'Echo'}
    ]);
    client.tickBattle();

    const behavior = events.find((entry) => entry.type === '战斗行为' && entry.data.targetSource === 'part loot');
    const ghost = events.find((entry) => entry.type === 'ghost 出现/遭遇');
    const stats = client.getBehaviorStats();
    const lastMove = socket.emitted.filter((entry) => entry.eventName === '0').pop().payload;
    client.stop();
    expect(behavior.message).to.equal('追 part loot');
    expect(behavior.data.visiblePartLoot).to.equal(1);
    expect(ghost.message).to.contain('ghost');
    expect(stats.partLootTargetEvents).to.equal(1);
    expect(stats.ghostEncounterEvents).to.equal(1);
    expect(lastMove).to.deep.equal({x: 240, y: 160});
  });

  it('should keep pursuing visible part loot until a body part pickup is recorded', () => {
    const socket = createFakeSocket();
    const events = [];
    const client = new SimulatedPlayerClient({
      botId: 'Bot_08',
      roomId: 'room_001',
      random: () => 0.4,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      movementIntervalMs: 100000,
      behaviorLogEveryTicks: 1,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-8'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-8', x: 100, y: 200, massTotal: 33}, [], [{x: 150, y: 220}], [], [], [
      {id: 'loot-1', x: 340, y: 360, part: {partType: 'HAND', displayName: '藤蔓手'}}
    ], []);
    client.tickBattle();
    client.tickBattle();
    client.tickBattle();

    const sources = events
      .filter((entry) => entry.type === '战斗行为')
      .map((entry) => entry.data.targetSource);
    client.stop();
    expect(sources).to.deep.equal(['可见食物', 'part loot', 'part loot']);
  });

  it('should keep pursuing smaller players until devour coverage is recorded', () => {
    const socket = createFakeSocket();
    const events = [];
    const client = new SimulatedPlayerClient({
      botId: 'Bot_11',
      roomId: 'room_001',
      random: () => 0.4,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      movementIntervalMs: 100000,
      behaviorLogEveryTicks: 1,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-11'}, {width: 5000, height: 5000});
    client.startBattle();
    client.behaviorStats.resourceTargetEvents = 1;
    client.behaviorStats.randomCruiseEvents = 1;
    client.behaviorStats.avoidanceEvents = 1;
    client.behaviorStats.pursuitEvents = 1;
    client.behaviorStats.bodyPartPickupEvents = 1;
    socket.emit('serverTellPlayerMove', {id: 'socket-11', x: 100, y: 100, massTotal: 50}, [
      {id: 'smaller', x: 150, y: 120, massTotal: 12},
      {id: 'larger', x: 10, y: 10, massTotal: 120}
    ], [{x: 400, y: 400}], [], [], [], []);
    client.tickBattle();

    const lastMove = socket.emitted.filter((entry) => entry.eventName === '0').pop().payload;
    const combatEvent = events.find((entry) => entry.type === '战斗行为' && entry.message.indexOf('devour') > -1);
    client.stop();
    expect(lastMove).to.deep.equal({x: 50, y: 20});
    expect(combatEvent.data.targetSource).to.equal('追击小玩家');
  });

  it('should log settlement key events for devour, body part pickup, and body completion', () => {
    const socket = createFakeSocket();
    const events = [];
    const client = new SimulatedPlayerClient({
      botId: 'Bot_08',
      roomId: 'room_001',
      random: () => 0.4,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      movementIntervalMs: 100000,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-8'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('settlement', {
      endedReason: 'body_complete',
      winnerName: 'Bot_08',
      keyEvents: [
        {eventType: 'part_pickup', displayName: '藤蔓手', partType: 'HAND', x: 10, y: 20},
        {eventType: 'part_stolen', displayName: '木勺手', partType: 'HAND', fromPlayerName: 'Bot_02', x: 30, y: 40}
      ]
    });

    const eventTypes = events.map((entry) => entry.type);
    client.stop();
    expect(eventTypes).to.include.members([
      'body part pickup',
      'devour',
      'body complete',
      '进入结算',
      '结算完成'
    ]);
    expect(events.find((entry) => entry.type === 'body complete').data.endedReason).to.equal('body_complete');
    expect(events.find((entry) => entry.type === 'devour').data.fromPlayerName).to.equal('Bot_02');
  });

  it('should not log body complete for non-winners that receive round settlement', () => {
    const socket = createFakeSocket();
    const events = [];
    const client = new SimulatedPlayerClient({
      botId: 'Bot_09',
      roomId: 'room_001',
      random: () => 0.4,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      movementIntervalMs: 100000,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-9'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('settlement', {
      endedReason: 'body_complete',
      winnerName: 'Bot_03',
      keyEvents: []
    });

    client.stop();
    expect(events.map((entry) => entry.type)).to.not.include('body complete');
    expect(client.getBehaviorStats().bodyCompleteEvents).to.equal(0);
  });

  it('should not send quick settlement as player chat from the fallback request helper', () => {
    const socket = createFakeSocket();
    const client = new SimulatedPlayerClient({
      botId: 'Bot_10',
      roomId: 'room_001',
      logger: {
        bot() {},
        error() {}
      },
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-10'}, {width: 5000, height: 5000});
    client.startBattle();
    client.requestSettlement();

    expect(socket.emitted.some((entry) => entry.eventName === 'playerChat' && entry.payload.message === '快速结算')).to.equal(false);
    client.stop();
  });

  it('should record pickup, devour, being devoured, and body complete from player meta updates during battle', () => {
    const socket = createFakeSocket();
    const events = [];
    const client = new SimulatedPlayerClient({
      botId: 'Bot_09',
      roomId: 'room_001',
      random: () => 0.4,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      movementIntervalMs: 100000,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-9'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-9', x: 100, y: 200, massTotal: 33}, [], [{x: 150, y: 220}], [], [], [], []);
    socket.emit('playerMetaUpdate', [{
      id: 'socket-9',
      name: 'Bot_09',
      bodyPartCount: 6,
      bodyParts: []
    }]);
    socket.emit('playerMetaUpdate', [{
      id: 'socket-9',
      name: 'Bot_09',
      bodyPartCount: 7,
      bodyParts: [
        {partId: 'own-head', type: 'HEAD', originPlayerId: 'socket-9', currentOwnerId: 'socket-9', sourceType: 'self_created'},
        {partId: 'map-heart', type: 'HEART', currentOwnerId: 'socket-9', sourceType: 'map_pickup', historyChain: [
          {eventType: 'picked', eventId: 'picked-1', playerId: 'socket-9', playerName: 'Bot_09', x: 120, y: 130}
        ]},
        {partId: 'stolen-mouth', type: 'MOUTH', currentOwnerId: 'socket-9', sourceType: 'kill_loot', historyChain: [
          {eventType: 'stolen', eventId: 'stolen-1', playerId: 'Victim_01', playerName: 'Victim_01', fromPlayerId: 'victim-1', toPlayerId: 'socket-9', x: 140, y: 150}
        ]},
        {partId: 'foreign-hand-1', type: 'HAND', originPlayerId: 'other-1', currentOwnerId: 'socket-9', sourceType: 'kill_loot'},
        {partId: 'foreign-hand-2', type: 'HAND', originPlayerId: 'other-2', currentOwnerId: 'socket-9', sourceType: 'kill_loot'},
        {partId: 'foreign-foot-1', type: 'FOOT', originPlayerId: 'other-3', currentOwnerId: 'socket-9', sourceType: 'kill_loot'},
        {partId: 'foreign-foot-2', type: 'FOOT', originPlayerId: 'other-4', currentOwnerId: 'socket-9', sourceType: 'kill_loot'}
      ]
    }]);
    socket.emit('playerMetaUpdate', [{
      id: 'socket-9',
      name: 'Bot_09',
      bodyPartCount: 6,
      bodyParts: []
    }]);

    const eventTypes = events.map((entry) => entry.type);
    const stats = client.getBehaviorStats();
    client.stop();
    expect(eventTypes).to.include.members(['body part pickup', 'devour', '被 devour', 'body complete']);
    expect(stats.bodyPartPickupEvents).to.equal(1);
    expect(stats.devourEvents).to.equal(1);
    expect(stats.devouredEvents).to.equal(1);
    expect(stats.bodyCompleteEvents).to.equal(1);
  });

  it('should not record body complete from starter loadout parts plus one pickup', () => {
    const socket = createFakeSocket();
    const events = [];
    const client = new SimulatedPlayerClient({
      botId: 'Bot_10',
      roomId: 'room_001',
      random: () => 0.4,
      logger: {
        bot(event) {
          events.push(event);
        },
        error() {}
      },
      movementIntervalMs: 100000,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('welcome', {id: 'socket-10'}, {width: 5000, height: 5000});
    client.startBattle();
    socket.emit('serverTellPlayerMove', {id: 'socket-10', x: 100, y: 200, massTotal: 33}, [], [{x: 150, y: 220}], [], [], [], []);
    socket.emit('playerMetaUpdate', [{
      id: 'socket-10',
      name: 'Bot_10',
      bodyPartCount: 7,
      bodyParts: [
        {partId: 'own-hand', type: 'HAND', originPlayerId: 'socket-10', currentOwnerId: 'socket-10', sourceType: 'self_created'},
        {partId: 'starter-head', type: 'HEAD', currentOwnerId: 'socket-10', sourceType: 'starter_loadout'},
        {partId: 'starter-foot', type: 'FOOT', currentOwnerId: 'socket-10', sourceType: 'starter_loadout'},
        {partId: 'starter-mouth', type: 'MOUTH', currentOwnerId: 'socket-10', sourceType: 'starter_loadout'},
        {partId: 'map-heart', type: 'HEART', currentOwnerId: 'socket-10', sourceType: 'map_pickup'}
      ]
    }]);

    const stats = client.getBehaviorStats();
    client.stop();
    expect(events.map((entry) => entry.type)).to.not.include('body complete');
    expect(stats.bodyCompleteEvents).to.equal(0);
  });
});
