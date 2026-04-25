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

  it('should rate limit target sync while still sending changed targets and keepalives', () => {
    const calls = [];
    const socket = {
      connected: true,
      emit(eventName, payload) {
        calls.push({eventName, payload});
      }
    };
    const targetSync = socketEmit.createTargetSync({
      minIntervalMs: 50,
      keepAliveMs: 250
    });

    expect(targetSync.emitIfNeeded(socket, '0', {x: 10, y: 10}, 1000)).to.equal(true);
    expect(targetSync.emitIfNeeded(socket, '0', {x: 10, y: 10}, 1016)).to.equal(false);
    expect(targetSync.emitIfNeeded(socket, '0', {x: 12, y: 10}, 1032)).to.equal(false);
    expect(targetSync.emitIfNeeded(socket, '0', {x: 12, y: 10}, 1050)).to.equal(true);
    expect(targetSync.emitIfNeeded(socket, '0', {x: 12, y: 10}, 1200)).to.equal(false);
    expect(targetSync.emitIfNeeded(socket, '0', {x: 12, y: 10}, 1300)).to.equal(true);

    expect(calls).to.deep.equal([
      {eventName: '0', payload: {x: 10, y: 10}},
      {eventName: '0', payload: {x: 12, y: 10}},
      {eventName: '0', payload: {x: 12, y: 10}}
    ]);
  });
});
