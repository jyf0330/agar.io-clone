/*jshint expr:true */

const EventEmitter = require('events');
const expect = require('chai').expect;
const {createBotClient} = require('../../apps/bot-client/src/bot-client');

function createFakeSocket() {
  const socket = new EventEmitter();
  socket.emitted = [];
  socket.closed = false;
  socket.emit = function (eventName) {
    const args = Array.prototype.slice.call(arguments, 1);
    socket.emitted.push({eventName, payload: args[0], args});
    EventEmitter.prototype.emit.apply(socket, [eventName].concat(args));
  };
  socket.close = function () {
    socket.closed = true;
  };
  return socket;
}

describe('bot-client.js', () => {
  it('should connect as a player and send the shared gotit payload', () => {
    const socket = createFakeSocket();
    let connectOptions;
    const client = createBotClient({
      serverUrl: 'http://127.0.0.1:3000',
      profile: {
        name: 'Bot_One',
        screenWidth: 1024,
        screenHeight: 768,
        playerCardPreviewDataUrl: 'data:image/png;base64,bot',
        bodySignature: {
          slotType: 'HAND',
          templateId: 'hand-open'
        }
      },
      ioFactory(url, options) {
        connectOptions = {url, options};
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');

    const gotit = socket.emitted.find((entry) => entry.eventName === 'gotit');
    expect(connectOptions.url).to.equal('http://127.0.0.1:3000');
    expect(connectOptions.options.query.type).to.equal('player');
    expect(gotit.payload).to.include({
      name: 'Bot_One',
      screenWidth: 1024,
      screenHeight: 768,
      playerCardPreviewDataUrl: 'data:image/png;base64,bot',
      isBot: true,
      consentToRecord: true,
      isReplayAllowed: true
    });
    expect(gotit.payload.bodySignature.templateId).to.equal('hand-open');
  });

  it('should store the welcome payload for later bot decisions', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      profile: {name: 'Bot_Two'},
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'socket-1', x: 100}, {width: 5000, height: 5000});

    expect(client.getState().player.id).to.equal('socket-1');
    expect(client.getState().game.width).to.equal(5000);
  });

  it('should emit player input actions from movement sync data', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      profile: {
        name: 'Bot_Action',
        strategy: {
          ejectMassThreshold: 100,
          splitMassThreshold: 200
        }
      },
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1'}, {width: 5000, height: 5000});
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 100, y: 100, massTotal: 250},
      [],
      [{x: 180, y: 120}],
      [],
      [],
      [],
      []
    );

    expect(socket.emitted.filter((entry) => ['0', '1', '2'].indexOf(entry.eventName) > -1)).to.deep.equal([
      {eventName: '0', payload: {x: 80, y: 20}, args: [{x: 80, y: 20}]},
      {eventName: '1', payload: undefined, args: []},
      {eventName: '2', payload: undefined, args: []}
    ]);
  });

  it('should log movement and mass gain events from sync data', () => {
    const socket = createFakeSocket();
    const lines = [];
    const client = createBotClient({
      profile: {name: 'Bot_Log'},
      behaviorLogEveryTicks: 1,
      logger: {
        log(message) {
          lines.push(message);
        }
      },
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1'}, {width: 5000, height: 5000});
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 100, y: 100, massTotal: 10},
      [],
      [{x: 180, y: 120}],
      [],
      [],
      [],
      []
    );
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 110, y: 105, massTotal: 13},
      [],
      [{x: 185, y: 125}],
      [],
      [],
      [],
      []
    );

    expect(lines.some((line) => line.indexOf('[BOT][Bot_Log][move]') > -1)).to.equal(true);
    expect(lines.some((line) => line.indexOf('[BOT][Bot_Log][eat] mass +3 -> 13') > -1)).to.equal(true);
  });

  it('should send event chat when food increases mass', () => {
    const socket = createFakeSocket();
    const lines = [];
    const client = createBotClient({
      profile: {name: 'Bot_Event'},
      behaviorChatCooldownMs: 0,
      logger: {
        log(message) {
          lines.push(message);
        }
      },
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1', massTotal: 10}, {width: 5000, height: 5000});
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 100, y: 100, massTotal: 13},
      [],
      [{x: 180, y: 120}],
      [],
      [],
      [],
      []
    );

    expect(lines.some((line) => line.indexOf('[BOT][Bot_Event][eat] mass +3 -> 13') > -1)).to.equal(true);
    expect(socket.emitted.filter((entry) => entry.eventName === 'playerChat').map((entry) => entry.payload)).to.deep.equal([
      {sender: 'Bot_Event', message: '我吃到了食物，质量 +3'}
    ]);
  });

  it('should send event chat for skill actions without movement intent chatter', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      profile: {
        name: 'Bot_Behavior',
        strategy: {
          ejectMassThreshold: 100,
          splitMassThreshold: 200
        }
      },
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1', massTotal: 250}, {width: 5000, height: 5000});
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 100, y: 100, massTotal: 250},
      [],
      [{x: 180, y: 120}],
      [],
      [],
      [],
      []
    );
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 120, y: 120, massTotal: 250},
      [],
      [],
      [],
      [],
      [{x: 240, y: 260, part: {partType: 'HEART'}}],
      []
    );

    const messages = socket.emitted
      .filter((entry) => entry.eventName === 'playerChat')
      .map((entry) => entry.payload.message);
    expect(messages).to.deep.equal([
      '我吐出孢子',
      '我分裂了'
    ]);
  });

  it('should not send chat for fallback wandering', () => {
    const socket = createFakeSocket();
    let now = 1000;
    const client = createBotClient({
      profile: {name: 'Bot_Wander'},
      behaviorChatCooldownMs: 5000,
      now() {
        return now;
      },
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1', x: 100, y: 100, massTotal: 20}, {width: 5000, height: 5000});
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 100, y: 100, massTotal: 20},
      [],
      [],
      [],
      [],
      [],
      []
    );
    now += 6000;
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 120, y: 110, massTotal: 20},
      [],
      [],
      [],
      [],
      [],
      []
    );

    expect(socket.emitted.filter((entry) => entry.eventName === 'playerChat')).to.deep.equal([]);
  });

  it('should send event chat for body part pickup, devour, being devoured, and body completion meta updates', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      profile: {name: 'Bot_Meta'},
      behaviorChatCooldownMs: 0,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1', name: 'Bot_Meta', massTotal: 20}, {width: 5000, height: 5000});
    socket.emit(
      'serverTellPlayerMove',
      {id: 'bot-1', x: 100, y: 100, massTotal: 20},
      [],
      [],
      [],
      [],
      [],
      []
    );
    socket.emit('playerMetaUpdate', [{
      id: 'bot-1',
      name: 'Bot_Meta',
      bodyPartCount: 4,
      bodyParts: [
        {partId: 'own-head', type: 'HEAD', originPlayerId: 'bot-1', currentOwnerId: 'bot-1', sourceType: 'self_created'},
        {partId: 'foreign-hand', type: 'HAND', currentOwnerId: 'bot-1', sourceType: 'kill_loot'},
        {partId: 'foreign-foot', type: 'FOOT', currentOwnerId: 'bot-1', sourceType: 'kill_loot'},
        {partId: 'foreign-mouth', type: 'MOUTH', currentOwnerId: 'bot-1', sourceType: 'kill_loot'}
      ]
    }]);
    socket.emit('playerMetaUpdate', [{
      id: 'bot-1',
      name: 'Bot_Meta',
      bodyPartCount: 5,
      bodyParts: [
        {partId: 'own-head', type: 'HEAD', originPlayerId: 'bot-1', currentOwnerId: 'bot-1', sourceType: 'self_created'},
        {partId: 'foreign-hand', type: 'HAND', currentOwnerId: 'bot-1', sourceType: 'kill_loot'},
        {partId: 'foreign-foot', type: 'FOOT', currentOwnerId: 'bot-1', sourceType: 'kill_loot'},
        {partId: 'stolen-mouth', type: 'MOUTH', currentOwnerId: 'bot-1', sourceType: 'kill_loot', displayName: '木勺嘴', historyChain: [
          {eventType: 'stolen', eventId: 'stolen-1', fromPlayerId: 'victim-1', fromPlayerName: 'Victim_01', toPlayerId: 'bot-1'}
        ]},
        {partId: 'map-heart', type: 'HEART', currentOwnerId: 'bot-1', sourceType: 'map_pickup', displayName: '亮晶心', historyChain: [
          {eventType: 'picked', eventId: 'picked-1', playerId: 'bot-1', playerName: 'Bot_Meta'}
        ]}
      ]
    }]);
    socket.emit('playerMetaUpdate', [{
      id: 'bot-1',
      name: 'Bot_Meta',
      bodyPartCount: 4,
      bodyParts: []
    }]);

    const messages = socket.emitted
      .filter((entry) => entry.eventName === 'playerChat')
      .map((entry) => entry.payload.message);
    expect(messages).to.include.members([
      '我捡到了 亮晶心',
      '我吃了 Victim_01，拿到木勺嘴',
      '我完成身体了',
      '我被别人吃了，部位数 5 -> 4'
    ]);
  });

  it('should log devour-like settlement key events', () => {
    const socket = createFakeSocket();
    const lines = [];
    const client = createBotClient({
      profile: {name: 'Bot_Log'},
      logger: {
        log(message) {
          lines.push(message);
        }
      },
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1'}, {width: 5000, height: 5000});
    socket.emit('settlement', {
      keyEvents: [{
        eventType: 'part_stolen',
        fromPlayerName: 'Victim_Bot',
        displayName: '木勺手'
      }]
    });

    expect(lines.some((line) => line.indexOf('[BOT][Bot_Log][devour] devour Victim_Bot') > -1)).to.equal(true);
  });

  it('should send event chat for devour and being devoured settlement events', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      profile: {name: 'Bot_Event'},
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1'}, {width: 5000, height: 5000});
    socket.emit('settlement', {
      keyEvents: [
        {
          eventType: 'part_stolen',
          fromPlayerName: 'Victim_Bot',
          toPlayerName: 'Bot_Event',
          displayName: '木勺手'
        },
        {
          eventType: 'part_stolen',
          fromPlayerName: 'Bot_Event',
          toPlayerName: 'Hunter_Bot',
          displayName: '藤蔓脚'
        },
        {
          eventType: 'part_stolen',
          fromPlayerName: 'Other_Bot',
          toPlayerName: 'Third_Bot',
          displayName: '旁观部位'
        }
      ]
    });

    expect(socket.emitted.filter((entry) => entry.eventName === 'playerChat').map((entry) => entry.payload)).to.deep.equal([
      {sender: 'Bot_Event', message: '我吃了 Victim_Bot，拿到木勺手'},
      {sender: 'Bot_Event', message: '我被 Hunter_Bot 吃了，失去藤蔓脚'}
    ]);
  });

  it('should say when the bot itself is eaten from a death event', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      profile: {name: 'Bot_Eaten'},
      behaviorChatCooldownMs: 0,
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1', name: 'Bot_Eaten'}, {width: 5000, height: 5000});
    socket.emit('playerDied', {
      playerEatenId: 'bot-1',
      playerEatenName: 'Bot_Eaten'
    });

    expect(socket.emitted.filter((entry) => entry.eventName === 'playerChat').map((entry) => entry.payload)).to.include.deep.members([
      {sender: 'Bot_Eaten', message: '我被吃掉了'}
    ]);
  });

  it('should log observed deaths without sending chat', () => {
    const socket = createFakeSocket();
    const lines = [];
    const client = createBotClient({
      profile: {name: 'Bot_Observer'},
      logger: {
        log(message) {
          lines.push(message);
        }
      },
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('welcome', {id: 'bot-1', name: 'Bot_Observer'}, {width: 5000, height: 5000});
    socket.emit('playerDied', {
      playerEatenId: 'other-1',
      playerEatenName: 'Other_Player'
    });

    expect(lines.some((line) => line.indexOf('[BOT][Bot_Observer][devour] Other_Player 被吃掉') > -1)).to.equal(true);
    expect(socket.emitted.filter((entry) => entry.eventName === 'playerChat')).to.deep.equal([]);
  });

  it('should re-enter the arena after a settlement RIP', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      profile: {name: 'Bot_Rejoin'},
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    socket.emit('connect');
    socket.emit('RIP');
    socket.emit('RIP');

    expect(socket.emitted.filter((entry) => entry.eventName === 'respawn')).to.have.length(1);

    socket.emit('welcome', {id: 'bot-rejoin'}, {width: 5000, height: 5000});

    const gotitPayloads = socket.emitted
      .filter((entry) => entry.eventName === 'gotit')
      .map((entry) => entry.payload);
    expect(gotitPayloads).to.have.length(2);
    expect(gotitPayloads[1]).to.include({
      name: 'Bot_Rejoin',
      isBot: true
    });
    expect(client.getState().player.id).to.equal('bot-rejoin');
  });

  it('should close the socket when a bot client is disconnected', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      ioFactory() {
        return socket;
      }
    });

    client.connect();
    client.disconnect();

    expect(socket.closed).to.equal(true);
  });
});
