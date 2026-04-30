/*jshint expr:true */

const EventEmitter = require('events');
const expect = require('chai').expect;
const {applyBotActions, planBotActions} = require('../../apps/bot-client/src/bot-actions');

function createFakeSocket() {
  const socket = new EventEmitter();
  socket.emitted = [];
  socket.emit = function (eventName, payload) {
    socket.emitted.push({eventName, payload});
    EventEmitter.prototype.emit.call(socket, eventName, payload);
  };
  return socket;
}

describe('bot-actions.js', () => {
  it('should plan player-like actions from visible world state', () => {
    const actions = planBotActions({
      player: {
        x: 100,
        y: 200,
        massTotal: 250
      },
      game: {
        width: 5000,
        height: 5000
      },
      visibleFood: [
        {x: 300, y: 220},
        {x: 900, y: 900}
      ],
      profile: {
        strategy: {
          splitMassThreshold: 220,
          ejectMassThreshold: 180
        }
      }
    });

    expect(actions).to.deep.equal([
      {type: 'moveTarget', target: {x: 300, y: 220}},
      {type: 'ejectMass'},
      {type: 'split'}
    ]);
  });

  it('should emit existing socket protocol events for bot actions', () => {
    const socket = createFakeSocket();

    applyBotActions(socket, [
      {type: 'moveTarget', target: {x: 10, y: 20}},
      {type: 'ejectMass'},
      {type: 'split'},
      {type: 'attemptConnection'}
    ]);

    expect(socket.emitted).to.deep.equal([
      {eventName: '0', payload: {x: 10, y: 20}},
      {eventName: '1', payload: undefined},
      {eventName: '2', payload: undefined},
      {eventName: '3', payload: undefined}
    ]);
  });
});
