/*jshint expr:true */

const expect = require('chai').expect;
const socketEmit = require('../../apps/client/src/socket-emit');

describe('socket-emit.js', () => {
  it('should emit when the socket is connected', () => {
    const calls = [];
    const socket = {
      connected: true,
      emit(eventName, payload) {
        calls.push({ eventName, payload });
      }
    };

    expect(socketEmit.emitIfReady(socket, 'playerChat', { message: 'hi' })).to.equal(true);
    expect(calls).to.deep.equal([{ eventName: 'playerChat', payload: { message: 'hi' } }]);
  });

  it('should skip emits when the socket is missing or disconnected', () => {
    expect(socketEmit.emitIfReady(null, 'pingcheck')).to.equal(false);
    expect(socketEmit.emitIfReady({ connected: false, emit() {} }, 'pingcheck')).to.equal(false);
  });
});
