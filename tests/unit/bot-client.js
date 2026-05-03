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

  it('should send event chat when the bot eats food', () => {
    const socket = createFakeSocket();
    const client = createBotClient({
      profile: {name: 'Bot_Event'},
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

    expect(socket.emitted.filter((entry) => entry.eventName === 'playerChat').map((entry) => entry.payload)).to.deep.equal([
      {sender: 'Bot_Event', message: '我吃到了食物，质量 +3'}
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
          displayName: '木勺手'
        },
        {
          eventType: 'part_stolen',
          fromPlayerName: 'Bot_Event',
          toPlayerName: 'Hunter_Bot',
          displayName: '藤蔓脚'
        }
      ]
    });

    expect(socket.emitted.filter((entry) => entry.eventName === 'playerChat').map((entry) => entry.payload)).to.deep.equal([
      {sender: 'Bot_Event', message: '我吃了 Victim_Bot，拿到木勺手'},
      {sender: 'Bot_Event', message: '我被 Hunter_Bot 吃了，失去藤蔓脚'}
    ]);
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
