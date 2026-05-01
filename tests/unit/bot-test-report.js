/*jshint expr:true */

const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;
const {generateSummaryMarkdown, writeSummary} = require('../../apps/bot-test/src/report-generator');

describe('bot test report generator', () => {
  it('should write a passing Chinese summary when every bot finishes settlement', () => {
    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      completedSettlement: true,
      bots: [
        {botId: 'Bot_01', state: 'Finished'},
        {botId: 'Bot_02', state: 'Finished'}
      ]
    });

    expect(markdown).to.contain('测试通过：所有 Bot 成功完成对局结算');
    expect(markdown).to.contain('成功人数：2');
    expect(markdown).to.contain('失败人数：0');
  });

  it('should include failed bot stage, last success, reason, and stack', () => {
    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      completedSettlement: false,
      bots: [
        {
          botId: 'Bot_03',
          state: 'Failed',
          failure: {
            stage: 'InBattle',
            reason: '位置同步异常',
            possibleCause: '服务器未返回坐标',
            stack: 'Error: bad sync'
          },
          lastSuccessEvent: {
            type: '战斗开始',
            message: '收到第一帧同步'
          }
        }
      ]
    });

    expect(markdown).to.contain('测试失败：存在 Bot 未完成对局结算');
    expect(markdown).to.contain('Bot_03');
    expect(markdown).to.contain('失败阶段：InBattle');
    expect(markdown).to.contain('最后一条成功事件：战斗开始 - 收到第一帧同步');
    expect(markdown).to.contain('可能原因：服务器未返回坐标');
    expect(markdown).to.contain('Error: bad sync');
  });

  it('should write summary.md into the session directory', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-report-'));
    const summaryPath = writeSummary(root, {
      roomId: 'room_001',
      completedSettlement: true,
      bots: [{botId: 'Bot_01', state: 'Finished'}]
    });

    expect(path.basename(summaryPath)).to.equal('summary.md');
    expect(fs.readFileSync(summaryPath, 'utf8')).to.contain('测试通过');
  });
});
