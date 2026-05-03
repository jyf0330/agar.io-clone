/*jshint expr:true */

const expect = require('chai').expect;
const {
  resolveDefaultBotSwarmOptions,
  startDefaultBotSwarm
} = require('../../apps/server/src/default-bot-swarm');

describe('default bot swarm', () => {
  it('should default the live server to three socket bots', () => {
    const options = resolveDefaultBotSwarmOptions({}, 3123);

    expect(options).to.deep.equal({
      enabled: true,
      count: 3,
      serverUrl: 'http://127.0.0.1:3123'
    });
  });

  it('should allow the default live bots to be disabled or resized by environment', () => {
    expect(resolveDefaultBotSwarmOptions({
      V5_DEFAULT_BOTS: '0',
      V5_DEFAULT_BOT_COUNT: '8'
    }, 3000)).to.include({
      enabled: false,
      count: 8
    });
  });

  it('should start and retain the default socket bot clients', () => {
    const calls = [];
    const clients = [{id: 'one'}, {id: 'two'}, {id: 'three'}];
    const parentLogs = [];
    const started = startDefaultBotSwarm({
      env: {},
      serverPort: 3123,
      startBotSwarm(options) {
        calls.push(options);
        return clients;
      },
      logger: {
        log(message) {
          parentLogs.push(message);
        },
        warn() {}
      }
    });

    expect(calls[0]).to.include({
      serverUrl: 'http://127.0.0.1:3123',
      count: 3
    });
    calls[0].logger.log('hidden bot detail');
    expect(parentLogs).to.have.length(0);
    expect(started).to.equal(clients);
  });
});
