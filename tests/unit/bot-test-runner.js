/*jshint expr:true */

const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;
const {runBotTest} = require('../../apps/bot-test/src/runner');
const {BOT_STATES} = require('../../apps/bot-test/src/state-machine');

class FakeClient {
  constructor(options) {
    this.botId = options.botId;
    this.logger = options.logger;
    this.state = BOT_STATES.NotStarted;
    this.requestedSettlement = false;
  }

  connect() {
    this.state = BOT_STATES.WaitingForPlayers;
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '确认身体',
      message: 'gotit 已发送，等待房间倒计时'
    });
  }

  markCountdown(seconds) {
    this.state = BOT_STATES.Countdown;
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '倒计时开始',
      message: seconds + ' 秒'
    });
  }

  startBattle() {
    this.state = BOT_STATES.InBattle;
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗开始',
      message: '进入战斗循环'
    });
  }

  requestSettlement() {
    this.requestedSettlement = true;
    this.state = BOT_STATES.Finished;
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '结算完成',
      message: '测试结果已记录'
    });
  }

  waitForStates() {
    return Promise.resolve(this.state);
  }

  waitForFinished() {
    return Promise.resolve(this.state);
  }

  stop() {}

  toResult() {
    return {
      botId: this.botId,
      state: this.state
    };
  }
}

describe('bot test runner', () => {
  it('should run a full logical room flow and write summary files', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-runner-'));
    const result = await runBotTest({
      botCount: 3,
      roomId: 'room_001',
      durationSeconds: 1,
      countdownSeconds: 0,
      logDir: root,
      seed: 123,
      serverUrl: 'http://game.local',
      sessionName: '2026-05-01_12-00-00',
      clientFactory: (options) => new FakeClient(options)
    });

    expect(result.completedSettlement).to.equal(true);
    expect(result.bots).to.have.length(3);
    expect(fs.existsSync(path.join(result.sessionDir, 'summary.md'))).to.equal(true);
    expect(fs.existsSync(path.join(result.sessionDir, 'room_room_001.md'))).to.equal(true);
    expect(fs.existsSync(path.join(result.sessionDir, 'raw_events.jsonl'))).to.equal(true);
    expect(fs.readFileSync(path.join(result.sessionDir, 'summary.md'), 'utf8')).to.contain('测试通过');
  });
});
