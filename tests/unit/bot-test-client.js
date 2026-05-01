/*jshint expr:true */

const EventEmitter = require('events');
const expect = require('chai').expect;
const {SimulatedPlayerClient} = require('../../apps/bot-test/src/simulated-player-client');
const {BOT_STATES} = require('../../apps/bot-test/src/state-machine');

function createFakeSocket() {
  const socket = new EventEmitter();
  socket.emitted = [];
  socket.connected = true;
  socket.emit = function (eventName, payload) {
    socket.emitted.push({eventName, payload});
    EventEmitter.prototype.emit.call(socket, eventName, payload);
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
    const client = new SimulatedPlayerClient({
      botId: 'Bot_01',
      roomId: 'room_001',
      serverUrl: 'http://game.local',
      random: () => 0,
      logger: {
        bot() {},
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

    expect(socket.emitted.some((entry) => entry.eventName === '0')).to.equal(true);
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
});
