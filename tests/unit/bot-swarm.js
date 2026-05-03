/*jshint expr:true */

const expect = require('chai').expect;
const {
  buildBotProfiles,
  parseBotSwarmOptions,
  startBotSwarm
} = require('../../apps/bot-client/src/bot-swarm');

describe('bot-swarm.js', () => {
  it('should build a round-robin set of uniquely named bot profiles', () => {
    const loaded = [];
    const profiles = buildBotProfiles({
      count: 5,
      profileNames: ['doudou', 'mochi'],
      loadProfile(profileName) {
        loaded.push(profileName);
        return {name: profileName + '_Bot'};
      }
    });

    expect(loaded).to.deep.equal(['doudou', 'mochi', 'doudou', 'mochi', 'doudou']);
    expect(profiles.map((profile) => profile.name)).to.deep.equal([
      'Doudou_Bot_1',
      'Mochi_Bot_2',
      'Doudou_Bot_3',
      'Mochi_Bot_4',
      'Doudou_Bot_5'
    ]);
  });

  it('should parse environment and argv options for batch bot startup', () => {
    const options = parseBotSwarmOptions({
      env: {
        BOT_SERVER_URL: 'http://127.0.0.1:3000',
        BOT_COUNT: '4',
        BOT_PROFILES: 'doudou, mochi'
      },
      argv: []
    });

    expect(options).to.deep.equal({
      serverUrl: 'http://127.0.0.1:3000',
      count: 4,
      profileNames: ['doudou', 'mochi']
    });
  });

  it('should connect every planned bot through the normal bot client', () => {
    const connected = [];
    const clients = startBotSwarm({
      serverUrl: 'http://game.local',
      count: 3,
      profileNames: ['doudou', 'mochi'],
      loadProfile(profileName) {
        return {name: profileName + '_Bot'};
      },
      createClient(options) {
        return {
          options,
          connect() {
            connected.push(options.profile.name);
          }
        };
      },
      logger: {
        log() {}
      }
    });

    expect(clients.length).to.equal(3);
    expect(clients[0].options.serverUrl).to.equal('http://game.local');
    expect(connected).to.deep.equal(['Doudou_Bot_1', 'Mochi_Bot_2', 'Doudou_Bot_3']);
  });

  it('should pass the swarm logger to each bot client for event logs', () => {
    const logger = {log() {}};
    const clients = startBotSwarm({
      serverUrl: 'http://game.local',
      count: 1,
      profileNames: ['doudou'],
      loadProfile() {
        return {name: 'doudou_Bot'};
      },
      createClient(options) {
        return {
          options,
          connect() {}
        };
      },
      logger
    });

    expect(clients[0].options.logger).to.equal(logger);
  });
});
