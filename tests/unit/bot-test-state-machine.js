/*jshint expr:true */

const expect = require('chai').expect;
const {
  BOT_STATES,
  FAILURE_REASONS,
  BotStateMachine
} = require('../../apps/bot-test/src/state-machine');

describe('bot test state machine', () => {
  it('should record state transitions with the last successful event', () => {
    let now = 1000;
    const events = [];
    const machine = new BotStateMachine({
      botId: 'Bot_01',
      now: () => now,
      logger: {
        bot(event) {
          events.push(event);
        }
      }
    });

    machine.transition(BOT_STATES.Connecting, '连接服务器', '开始连接');
    now += 120;
    machine.transition(BOT_STATES.Connected, '连接服务器', '成功，耗时 120ms');

    expect(machine.state).to.equal(BOT_STATES.Connected);
    expect(machine.lastSuccessEvent.message).to.equal('成功，耗时 120ms');
    expect(events.map((event) => event.state)).to.deep.equal([
      BOT_STATES.Connecting,
      BOT_STATES.Connected
    ]);
  });

  it('should fail with timeout when a stage exceeds its configured duration', () => {
    let now = 1000;
    const machine = new BotStateMachine({
      botId: 'Bot_02',
      now: () => now,
      timeouts: {
        Connecting: 50
      },
      logger: {
        bot() {}
      }
    });

    machine.transition(BOT_STATES.Connecting, '连接服务器', '开始连接');
    now += 51;
    const timedOut = machine.checkTimeout();

    expect(timedOut).to.equal(true);
    expect(machine.state).to.equal(BOT_STATES.Timeout);
    expect(machine.failure.reason).to.equal(FAILURE_REASONS.Timeout);
    expect(machine.failure.stage).to.equal(BOT_STATES.Connecting);
  });
});
