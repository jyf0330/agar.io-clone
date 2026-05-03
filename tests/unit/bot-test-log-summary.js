/*jshint expr:true */

const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;
const {
  buildBotLogSummary,
  formatBotLogSummaryMarkdown
} = require('../../apps/bot-test/src/log-summary');

function writeJsonl(filePath, events) {
  fs.writeFileSync(filePath, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
}

describe('bot test log summary', () => {
  it('should collapse bot smoke logs into a concise dated timeline', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-log-summary-'));
    const sessionDir = path.join(root, '2026-05-02_02-08-24');
    fs.mkdirSync(sessionDir, {recursive: true});
    fs.writeFileSync(path.join(sessionDir, 'summary.md'), [
      '# 自动对局测试总结',
      '',
      '测试通过：所有 Bot 成功完成对局结算',
      '',
      '- 房间：recurring-bot-smoke',
      '- 成功人数：6',
      '- 失败人数：0',
      '- 是否完成结算：是'
    ].join('\n'));
    writeJsonl(path.join(sessionDir, 'raw_events.jsonl'), [
      {
        time: '2026-05-01T18:08:24.000Z',
        type: '测试房间创建',
        roomId: 'recurring-bot-smoke',
        state: 'Room',
        message: '使用共享服务器房间',
        data: {botCount: 6, serverUrl: 'http://127.0.0.1:3101'}
      },
      {
        time: '2026-05-01T18:08:34.000Z',
        type: '战斗行为',
        botId: 'Bot_01',
        roomId: 'recurring-bot-smoke',
        state: 'InBattle',
        message: '移动追资源',
        data: {x: 10, y: 20, visibleFood: 30}
      },
      {
        time: '2026-05-01T18:08:34.000Z',
        type: '战斗技能',
        botId: 'Bot_01',
        roomId: 'recurring-bot-smoke',
        state: 'InBattle',
        message: '执行吐孢子',
        data: {x: 10, y: 20, visibleFood: 30}
      },
      {
        time: '2026-05-01T18:08:34.000Z',
        type: '战斗技能',
        botId: 'Bot_02',
        roomId: 'recurring-bot-smoke',
        state: 'InBattle',
        message: '执行吐孢子',
        data: {x: 30, y: 40, visibleFood: 22}
      },
      {
        time: '2026-05-01T18:08:38.000Z',
        type: '战斗技能',
        botId: 'Bot_01',
        roomId: 'recurring-bot-smoke',
        state: 'InBattle',
        message: '执行分裂',
        data: {x: 11, y: 22}
      },
      {
        time: '2026-05-01T18:08:50.000Z',
        type: '战斗技能',
        botId: 'Bot_01',
        roomId: 'recurring-bot-smoke',
        state: 'InBattle',
        message: '执行吐孢子',
        data: {x: 99, y: 100}
      },
      {
        time: '2026-05-01T18:09:00.000Z',
        type: '结算完成',
        botId: 'Bot_01',
        roomId: 'recurring-bot-smoke',
        state: 'Finished',
        message: '测试结果已记录',
        data: {endedReason: 'demo_quick_end'}
      }
    ]);

    const summary = buildBotLogSummary({
      logDir: root,
      limit: 1
    });
    const markdown = formatBotLogSummaryMarkdown(summary);

    expect(markdown).to.contain('2026-05-02_02-08-24');
    expect(markdown).to.contain('recurring-bot-smoke');
    expect(markdown).to.contain('通过');
    expect(markdown).to.contain('Bot_01, Bot_02：执行吐孢子');
    expect(markdown).to.contain('Bot_01：执行分裂');
    expect(markdown).to.contain('Bot_01：结算完成');
    expect(markdown).to.not.contain('02:08:50');
    expect(markdown).to.not.contain('visibleFood');
    expect(markdown).to.not.contain('"x"');
  });
});
