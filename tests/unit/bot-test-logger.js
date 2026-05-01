/*jshint expr:true */

const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;
const {BotTestLogger} = require('../../apps/bot-test/src/logger');

describe('bot test logger', () => {
  it('should write Chinese markdown logs and raw jsonl events', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-logger-'));
    const logger = new BotTestLogger({
      rootDir: root,
      sessionName: '2026-05-01_12-00-00',
      roomId: 'room_001',
      clock: () => new Date('2026-05-01T04:01:03.000Z')
    });

    logger.bot({
      botId: 'Bot_01',
      state: 'Connected',
      type: '连接服务器',
      message: '成功，耗时 120ms',
      data: {elapsedMs: 120}
    });
    logger.room({
      type: '倒计时开始',
      message: '5 秒',
      data: {seconds: 5}
    });
    logger.error({
      botId: 'Bot_01',
      state: 'Failed',
      type: '异常',
      message: '位置同步失败',
      data: {reason: '服务器未返回坐标'}
    });

    const botLog = fs.readFileSync(path.join(logger.sessionDir, 'bot_01.md'), 'utf8');
    const roomLog = fs.readFileSync(path.join(logger.sessionDir, 'room_room_001.md'), 'utf8');
    const errors = fs.readFileSync(path.join(logger.sessionDir, 'errors.md'), 'utf8');
    const rawLines = fs.readFileSync(path.join(logger.sessionDir, 'raw_events.jsonl'), 'utf8').trim().split('\n');

    expect(botLog).to.contain('[12:01:03][Bot_01][连接服务器] 成功，耗时 120ms');
    expect(roomLog).to.contain('[12:01:03][房间 room_001][倒计时开始] 5 秒');
    expect(errors).to.contain('[12:01:03][Bot_01][异常] 位置同步失败');
    expect(JSON.parse(rawLines[0])).to.include({
      type: '连接服务器',
      botId: 'Bot_01',
      roomId: 'room_001',
      state: 'Connected',
      message: '成功，耗时 120ms'
    });
  });
});
