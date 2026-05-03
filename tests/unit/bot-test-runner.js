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
    this.behaviorStats = {
      bodySelectionEvents: 0,
      syncEvents: 0,
      movementEvents: 0,
      resourceTargetEvents: 0,
      randomCruiseEvents: 0,
      skillEvents: 0,
      ejectMassEvents: 0,
      splitEvents: 0,
      connectionAttemptEvents: 0,
      avoidanceEvents: 0,
      pursuitEvents: 0,
      partLootTargetEvents: 0,
      ghostEncounterEvents: 0,
      chatEvents: 0
    };
  }

  connect() {
    this.state = BOT_STATES.WaitingForPlayers;
    this.logger.bot({
      botId: this.botId,
      state: BOT_STATES.Connecting,
      type: '连接服务器',
      message: '开始连接 http://game.local',
      data: {socketType: 'player'}
    });
    this.logger.bot({
      botId: this.botId,
      state: BOT_STATES.Connected,
      type: '连接服务器',
      message: '成功，耗时 50ms',
      data: {socketType: 'player'}
    });
    this.logger.bot({
      botId: this.botId,
      state: BOT_STATES.EnteringLobby,
      type: '进入大厅',
      message: '发送 respawn 请求'
    });
    this.logger.bot({
      botId: this.botId,
      state: BOT_STATES.RequestingStart,
      type: '请求开始游戏',
      message: '收到 welcome，准备提交 gotit'
    });
    this.logger.bot({
      botId: this.botId,
      state: BOT_STATES.SelectingBodyPart,
      type: '补全身体',
      message: '选择零件=藤蔓手，结果=成功'
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '确认身体',
      message: 'gotit 已发送，等待房间倒计时'
    });
    this.behaviorStats.bodySelectionEvents = 1;
    this.behaviorStats.syncEvents = 1;
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
    this.behaviorStats.movementEvents = 1;
    this.behaviorStats.resourceTargetEvents = 1;
    this.behaviorStats.skillEvents = 1;
    this.behaviorStats.ejectMassEvents = 1;
    this.behaviorStats.splitEvents = 1;
    this.behaviorStats.connectionAttemptEvents = 1;
    this.behaviorStats.avoidanceEvents = 1;
    this.behaviorStats.pursuitEvents = 1;
    this.behaviorStats.partLootTargetEvents = 1;
    this.behaviorStats.ghostEncounterEvents = 1;
    this.behaviorStats.chatEvents = 1;
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗行为',
      message: '移动追资源',
      data: {targetSource: '可见食物', targetX: 10, targetY: 20}
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗行为',
      message: '随机移动',
      data: {targetSource: '随机巡航', targetX: 30, targetY: 40}
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗行为',
      message: '避让大玩家',
      data: {targetSource: '避让大玩家', targetX: 50, targetY: 60}
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗行为',
      message: '追击小玩家',
      data: {targetSource: '追击小玩家', targetX: 70, targetY: 80}
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗行为',
      message: '追 part loot',
      data: {targetSource: 'part loot', targetX: 90, targetY: 100, visiblePartLoot: 1}
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: 'ghost 出现/遭遇',
      message: 'ghost 出现，改向移动',
      data: {targetSource: 'ghost', targetX: 110, targetY: 120}
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗技能',
      message: '执行吐孢子'
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗技能',
      message: '执行分裂'
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗技能',
      message: '执行连接尝试'
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '局内聊天',
      message: '我去那边看看'
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: 'devour',
      message: 'devour Bot_02'
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '被 devour',
      message: '被 Bot_03 devour'
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: 'body part pickup',
      message: '捡到藤蔓手'
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: 'body complete',
      message: '完成身体'
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

  finishNaturally() {
    this.state = BOT_STATES.Finished;
    this.logger.bot({
      botId: this.botId,
      state: BOT_STATES.Settling,
      type: '进入结算',
      message: '收到 settlement',
      data: {endedReason: 'body_complete'}
    });
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '结算完成',
      message: '测试结果已记录',
      data: {endedReason: 'body_complete'}
    });
  }

  waitForStates() {
    return Promise.resolve(this.state);
  }

  waitForFinished() {
    if (this.state === BOT_STATES.InBattle) {
      this.finishNaturally();
    }
    return Promise.resolve(this.state);
  }

  stop() {}

  toResult() {
    return {
      botId: this.botId,
      state: this.state
    };
  }

  getBehaviorStats() {
    return this.behaviorStats;
  }
}

class MissingHumanizedBehaviorClient extends FakeClient {
  startBattle() {
    super.startBattle();
    this.behaviorStats.avoidanceEvents = 0;
    this.behaviorStats.pursuitEvents = 0;
    this.behaviorStats.chatEvents = 0;
  }
}

class NaturalSettlementClient extends FakeClient {
  waitForFinished() {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.state === BOT_STATES.InBattle) {
          this.finishNaturally();
        }
        resolve(this.state);
      }, 5);
    });
  }

  requestSettlement() {
    this.requestedSettlement = true;
  }
}

class SparseTimelineClient extends FakeClient {
  startBattle() {
    this.state = BOT_STATES.InBattle;
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '战斗开始',
      message: '进入战斗循环'
    });
    Object.keys(this.behaviorStats).forEach((key) => {
      this.behaviorStats[key] = 1;
    });
  }
}

class ConnectFailureClient extends FakeClient {
  connect() {
    this.state = BOT_STATES.Failed;
    this.logger.bot({
      botId: this.botId,
      state: this.state,
      type: '异常',
      message: 'xhr poll error',
      level: 'error',
      data: {failedStage: BOT_STATES.Connecting, reason: '连接失败'}
    });
  }
}

describe('bot test runner', () => {
  it('should run a full logical room flow and write summary files', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-runner-'));
    const result = await runBotTest({
      botCount: 3,
      roomId: 'room_001',
      durationSeconds: 1,
      behaviorValidationSeconds: 0,
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

  it('should not stop battle early when behavior stats are incomplete before natural settlement', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-runner-'));
    const result = await runBotTest({
      botCount: 1,
      roomId: 'room_no_early_behavior_stop',
      durationSeconds: 0,
      behaviorValidationSeconds: 1,
      countdownSeconds: 0,
      logDir: root,
      seed: 123,
      serverUrl: 'http://game.local',
      sessionName: '2026-05-01_13-45-00',
      clientFactory: (options) => new MissingHumanizedBehaviorClient(options)
    });

    const summary = fs.readFileSync(path.join(result.sessionDir, 'summary.md'), 'utf8');
    expect(result.completedSettlement).to.equal(true);
    expect(result.bots[0].state).to.equal(BOT_STATES.Finished);
    expect(summary).to.not.contain('战斗行为缺失');
    expect(summary).to.not.contain('2 分钟内未覆盖完整真人玩家操作');
  });

  it('should wait for natural settlement instead of forcing quick settlement at the configured duration', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-runner-'));
    const clients = [];
    const result = await runBotTest({
      botCount: 1,
      roomId: 'room_004',
      durationSeconds: 0,
      behaviorValidationSeconds: 0,
      countdownSeconds: 0,
      logDir: root,
      seed: 123,
      serverUrl: 'http://game.local',
      sessionName: '2026-05-01_13-30-00',
      timeouts: {matchEndTimeoutSeconds: 1, settlementTimeoutSeconds: 1},
      clientFactory: (options) => {
        const client = new NaturalSettlementClient(options);
        clients.push(client);
        return client;
      }
    });

    const rawEvents = fs.readFileSync(path.join(result.sessionDir, 'raw_events.jsonl'), 'utf8');
    expect(result.completedSettlement).to.equal(true);
    expect(clients[0].requestedSettlement).to.equal(false);
    expect(rawEvents).to.not.contain('快速结算');
    expect(rawEvents).to.not.contain('测试时长结束');
  });

  it('should fail a completed bot when required timeline events are missing from raw logs', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-runner-'));
    const result = await runBotTest({
      botCount: 1,
      roomId: 'room_005',
      durationSeconds: 0,
      behaviorValidationSeconds: 0,
      countdownSeconds: 0,
      logDir: root,
      seed: 123,
      serverUrl: 'http://game.local',
      sessionName: '2026-05-01_14-00-00',
      timeouts: {matchEndTimeoutSeconds: 1, settlementTimeoutSeconds: 1},
      clientFactory: (options) => new SparseTimelineClient(options)
    });

    const summary = fs.readFileSync(path.join(result.sessionDir, 'summary.md'), 'utf8');
    expect(result.completedSettlement).to.equal(false);
    expect(result.bots[0].state).to.equal(BOT_STATES.Failed);
    expect(summary).to.contain('关键事件缺失');
    expect(summary).to.contain('局内聊天');
    expect(summary).to.contain('part loot');
    expect(summary).to.contain('devour');
    expect(summary).to.contain('被 devour');
    expect(summary).to.contain('body part pickup');
    expect(summary).to.contain('body complete');
  });

  it('should stop at join failure instead of reporting battle behavior failure', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-runner-'));
    const result = await runBotTest({
      botCount: 1,
      roomId: 'room_006',
      durationSeconds: 0,
      behaviorValidationSeconds: 0,
      countdownSeconds: 0,
      logDir: root,
      seed: 123,
      serverUrl: 'http://game.local',
      sessionName: '2026-05-01_14-30-00',
      clientFactory: (options) => new ConnectFailureClient(options)
    });

    const summary = fs.readFileSync(path.join(result.sessionDir, 'summary.md'), 'utf8');
    expect(result.completedSettlement).to.equal(false);
    expect(result.bots[0].state).to.equal(BOT_STATES.Failed);
    expect(summary).to.contain('xhr poll error');
    expect(summary).to.not.contain('战斗开始：玩家数=1');
    expect(summary).to.not.contain('战斗行为缺失');
  });
});
