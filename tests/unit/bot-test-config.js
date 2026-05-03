/*jshint expr:true */

const expect = require('chai').expect;
const {DEFAULT_CONFIG, parseBotTestArgs} = require('../../apps/bot-test/src/config');

describe('bot test config', () => {
  it('should parse cli arguments with test defaults', () => {
    const config = parseBotTestArgs([
      '--bots', '6',
      '--room', 'test-room-001',
      '--duration', '300',
      '--behaviorValidationSeconds', '120',
      '--logDir', 'logs/bot-test',
      '--seed', '12345',
      '--serverUrl', 'http://127.0.0.1:3000'
    ]);

    expect(config).to.include({
      botCount: 6,
      roomId: 'test-room-001',
      durationSeconds: 300,
      behaviorValidationSeconds: 120,
      logDir: 'logs/bot-test',
      seed: 12345,
      serverUrl: 'http://127.0.0.1:3000'
    });
    expect(config.timeouts.connectTimeoutSeconds).to.equal(10);
  });

  it('should parse timeout overrides', () => {
    const config = parseBotTestArgs([
      '--connectTimeoutSeconds', '2',
      '--bodySelectTimeoutSeconds', '3',
      '--countdownTimeoutSeconds', '4',
      '--battleStartTimeoutSeconds', '5',
      '--matchEndTimeoutSeconds', '6'
    ]);

    expect(config.timeouts).to.include({
      connectTimeoutSeconds: 2,
      bodySelectTimeoutSeconds: 3,
      countdownTimeoutSeconds: 4,
      battleStartTimeoutSeconds: 5,
      matchEndTimeoutSeconds: 6
    });
  });

  it('should keep cli behavior validation at the two-minute full-player window', () => {
    const config = parseBotTestArgs([
      '--behaviorValidationSeconds', '20'
    ]);

    expect(config.behaviorValidationSeconds).to.equal(DEFAULT_CONFIG.behaviorValidationSeconds);
  });
});
