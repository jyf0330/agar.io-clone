/*jshint expr:true */

const EventEmitter = require('events');
const expect = require('chai').expect;
const {createBotClient} = require('../../apps/bot-client/src/bot-client');

function createFakeSocket() {
  const socket = new EventEmitter();
  socket.emitted = [];
  socket.emit = function (eventName) {
    const args = Array.prototype.slice.call(arguments, 1);
    socket.emitted.push({eventName, payload: args[0], args});
    EventEmitter.prototype.emit.apply(socket, [eventName].concat(args));
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
      {eventName: '0', payload: {x: 180, y: 120}, args: [{x: 180, y: 120}]},
      {eventName: '1', payload: undefined, args: []},
      {eventName: '2', payload: undefined, args: []}
    ]);
  });
});
