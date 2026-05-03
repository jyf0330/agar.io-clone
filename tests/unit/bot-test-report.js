/*jshint expr:true */

const fs = require('fs');
const os = require('os');
const path = require('path');
const expect = require('chai').expect;
const {generateSummaryMarkdown, writeSummary} = require('../../apps/bot-test/src/report-generator');

function writeJsonl(filePath, events) {
  fs.writeFileSync(filePath, events.map((event) => JSON.stringify(event)).join('\n') + '\n');
}

describe('bot test report generator', () => {
  it('should write a passing Chinese summary when every bot finishes settlement', () => {
    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      serverUrl: 'http://127.0.0.1:3102',
      startedAt: '2026-05-01T18:56:09.000Z',
      endedAt: '2026-05-01T18:58:09.000Z',
      keyEvents: [
        {gameTime: '00:00', place: 'room_001', actor: '房间', event: '战斗开始'},
        {gameTime: '02:00', place: '目标(300,220)', actor: 'Bot_01', event: '执行吐孢子'}
      ],
      completedSettlement: true,
      bots: [
        {botId: 'Bot_01', state: 'Finished'},
        {botId: 'Bot_02', state: 'Finished'}
      ]
    });

    expect(markdown).to.contain('测试通过：所有 Bot 成功完成对局结算');
    expect(markdown).to.contain('成功人数：2');
    expect(markdown).to.contain('失败人数：0');
    expect(markdown).to.contain('## 游戏时间地点事件');
    expect(markdown).to.contain('游戏时间：00:00 -> 02:00');
    expect(markdown).to.contain('地点：room_001 @ http://127.0.0.1:3102');
    expect(markdown).to.contain('00:00 room_001 房间：战斗开始');
    expect(markdown).to.contain('02:00 目标(300,220) Bot_01：执行吐孢子');
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

  it('should include the complete full-match event timeline from raw events', () => {
    const rawEvents = [
      {time: '2026-05-01T18:00:00.000Z', type: '玩家加入', roomId: 'room_001', message: 'Bot_01 加入测试房间', data: {botId: 'Bot_01'}},
      {time: '2026-05-01T18:00:01.000Z', type: '补全身体', botId: 'Bot_01', roomId: 'room_001', message: '选择零件=藤蔓手，结果=成功', data: {partId: 'hand_left_option_01'}},
      {time: '2026-05-01T18:00:02.000Z', type: '确认身体', botId: 'Bot_01', roomId: 'room_001', message: 'gotit 已发送，等待房间倒计时'},
      {time: '2026-05-01T18:00:03.000Z', type: '倒计时开始', roomId: 'room_001', message: '5 秒'},
      {time: '2026-05-01T18:00:08.000Z', type: '战斗开始', roomId: 'room_001', message: '玩家数=1'},
      {time: '2026-05-01T18:00:09.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '移动追资源', data: {targetSource: '可见食物', targetX: 10, targetY: 20}},
      {time: '2026-05-01T18:00:10.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '随机移动', data: {targetSource: '随机巡航', targetX: 30, targetY: 40}},
      {time: '2026-05-01T18:00:11.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '避让大玩家', data: {targetSource: '避让大玩家', targetX: 50, targetY: 60}},
      {time: '2026-05-01T18:00:12.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '追击小玩家', data: {targetSource: '追击小玩家', targetX: 70, targetY: 80}},
      {time: '2026-05-01T18:00:13.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '追 part loot', data: {targetSource: 'part loot', targetX: 90, targetY: 100, visiblePartLoot: 1}},
      {time: '2026-05-01T18:00:14.000Z', type: 'ghost 出现/遭遇', botId: 'Bot_01', roomId: 'room_001', message: 'ghost 出现，改向移动', data: {targetSource: 'ghost', targetX: 110, targetY: 120}},
      {time: '2026-05-01T18:00:15.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行吐孢子'},
      {time: '2026-05-01T18:00:16.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行分裂'},
      {time: '2026-05-01T18:00:17.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行连接尝试'},
      {time: '2026-05-01T18:00:18.000Z', type: '局内聊天', botId: 'Bot_01', roomId: 'room_001', message: '我去那边看看'},
      {time: '2026-05-01T18:00:19.000Z', type: 'devour', botId: 'Bot_01', roomId: 'room_001', message: 'devour Bot_02'},
      {time: '2026-05-01T18:00:20.000Z', type: '被 devour', botId: 'Bot_01', roomId: 'room_001', message: '被 Bot_03 devour'},
      {time: '2026-05-01T18:00:21.000Z', type: 'body part pickup', botId: 'Bot_01', roomId: 'room_001', message: '捡到藤蔓手'},
      {time: '2026-05-01T18:00:22.000Z', type: 'body complete', botId: 'Bot_01', roomId: 'room_001', message: '完成身体'},
      {time: '2026-05-01T18:00:23.000Z', type: '进入结算', botId: 'Bot_01', roomId: 'room_001', message: '收到 settlement', data: {endedReason: 'body_complete'}},
      {time: '2026-05-01T18:00:24.000Z', type: '结算完成', botId: 'Bot_01', roomId: 'room_001', message: '测试结果已记录', data: {endedReason: 'body_complete'}}
    ];

    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      completedSettlement: true,
      rawEvents,
      bots: [{botId: 'Bot_01', state: 'Finished'}]
    });

    [
      'Bot_01 加入测试房间',
      '选择零件=藤蔓手',
      'gotit 已发送',
      '倒计时开始：5 秒',
      '战斗开始',
      '移动追资源（可见食物）',
      '随机移动（随机巡航）',
      '避让大玩家',
      '追击小玩家',
      '追 part loot（part loot）',
      'ghost 出现，改向移动',
      '执行吐孢子',
      '执行分裂',
      '执行连接尝试',
      '局内聊天：我去那边看看',
      'devour Bot_02',
      '被 Bot_03 devour',
      '捡到藤蔓手',
      '完成身体',
      '收到 settlement，endedReason=body_complete',
      '测试结果已记录，endedReason=body_complete'
    ].forEach((text) => {
      expect(markdown).to.contain(text);
    });
  });

  it('should show the real Socket.IO player entry flow in the game timeline', () => {
    const rawEvents = [
      {time: '2026-05-01T18:00:00.000Z', type: '连接服务器', botId: 'Bot_01', roomId: 'room_001', message: '开始连接 http://game.local', data: {socketType: 'player'}},
      {time: '2026-05-01T18:00:01.000Z', type: '连接服务器', botId: 'Bot_01', roomId: 'room_001', message: '成功，耗时 50ms', data: {socketType: 'player'}},
      {time: '2026-05-01T18:00:02.000Z', type: '进入大厅', botId: 'Bot_01', roomId: 'room_001', message: '发送 respawn 请求'},
      {time: '2026-05-01T18:00:03.000Z', type: '请求开始游戏', botId: 'Bot_01', roomId: 'room_001', message: '收到 welcome，准备提交 gotit'},
      {time: '2026-05-01T18:00:04.000Z', type: '确认身体', botId: 'Bot_01', roomId: 'room_001', message: 'gotit 已发送，等待房间倒计时'},
      {time: '2026-05-01T18:00:05.000Z', type: '倒计时开始', roomId: 'room_001', message: '5 秒'},
      {time: '2026-05-01T18:00:10.000Z', type: '战斗开始', roomId: 'room_001', message: '玩家数=1'},
      {time: '2026-05-01T18:00:20.000Z', type: '进入结算', botId: 'Bot_01', roomId: 'room_001', message: '收到 settlement', data: {endedReason: 'round_end'}}
    ];

    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      completedSettlement: true,
      rawEvents,
      bots: [{botId: 'Bot_01', state: 'Finished'}]
    });

    expect(markdown).to.contain('connect(type=player)：开始连接 http://game.local');
    expect(markdown).to.contain('connect(type=player)：成功，耗时 50ms');
    expect(markdown).to.contain('发送 respawn 请求');
    expect(markdown).to.contain('收到 welcome，准备提交 gotit');
    expect(markdown).to.contain('gotit 已发送，等待房间倒计时');
  });

  it('should keep periodic battle samples between first actions and settlement', () => {
    const rawEvents = [
      {time: '2026-05-01T18:00:00.000Z', type: '战斗开始', roomId: 'room_001', message: '玩家数=1'},
      {time: '2026-05-01T18:00:01.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '移动追资源', data: {x: 10, y: 20, targetSource: '可见食物'}},
      {time: '2026-05-01T18:00:04.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行吐孢子', data: {x: 40, y: 50}},
      {time: '2026-05-01T18:00:08.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行分裂', data: {x: 80, y: 90}},
      {time: '2026-05-01T18:00:12.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行连接尝试', data: {x: 120, y: 130}},
      {time: '2026-05-01T18:03:00.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '移动追资源', data: {x: 300, y: 310, targetSource: '可见食物'}},
      {time: '2026-05-01T18:04:00.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行吐孢子', data: {x: 400, y: 410}},
      {time: '2026-05-01T18:07:33.000Z', type: '进入结算', botId: 'Bot_01', roomId: 'room_001', message: '收到 settlement', data: {endedReason: 'round_end'}}
    ];

    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      completedSettlement: true,
      rawEvents,
      bots: [{botId: 'Bot_01', state: 'Finished'}]
    });

    expect(markdown).to.contain('03:00 玩家(300,310) Bot_01：移动追资源（可见食物）');
    expect(markdown).to.contain('04:00 玩家(400,410) Bot_01：执行吐孢子');
    expect(markdown).to.contain('07:33 room_001 Bot_01：收到 settlement，endedReason=round_end');
  });

  it('should summarize continuous per-bot battle data coverage from raw events', () => {
    const rawEvents = [
      {time: '2026-05-01T18:00:00.000Z', type: '战斗开始', roomId: 'room_001', message: '玩家数=2'},
      {time: '2026-05-01T18:00:01.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '移动追资源', data: {targetSource: '可见食物'}},
      {time: '2026-05-01T18:00:30.000Z', type: '战斗行为', botId: 'Bot_02', roomId: 'room_001', message: '随机移动', data: {targetSource: '随机巡航'}},
      {time: '2026-05-01T18:02:00.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行吐孢子'},
      {time: '2026-05-01T18:03:05.000Z', type: '战斗行为', botId: 'Bot_02', roomId: 'room_001', message: '避让大玩家', data: {targetSource: '避让大玩家'}},
      {time: '2026-05-01T18:03:10.000Z', type: '进入结算', botId: 'Bot_01', roomId: 'room_001', message: '收到 settlement', data: {endedReason: 'round_end'}}
    ];

    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      completedSettlement: true,
      rawEvents,
      bots: [
        {botId: 'Bot_01', state: 'Finished'},
        {botId: 'Bot_02', state: 'Finished'}
      ]
    });

    expect(markdown).to.contain('## Bot 持续数据覆盖');
    expect(markdown).to.contain('Bot_01：战斗数据 2 条；覆盖分钟 00, 02；最后 02:00 战斗技能 - 执行吐孢子');
    expect(markdown).to.contain('Bot_02：战斗数据 2 条；覆盖分钟 00, 03；最后 03:05 战斗行为 - 避让大玩家');
  });

  it('should keep required late key events when the timeline is long', () => {
    const rawEvents = [
      {time: '2026-05-01T18:00:00.000Z', type: '战斗开始', roomId: 'room_001', message: '玩家数=8'}
    ];
    for (let index = 0; index < 180; index += 1) {
      rawEvents.push({
        time: new Date(Date.UTC(2026, 4, 1, 18, 0, index + 1)).toISOString(),
        type: '玩家加入',
        roomId: 'room_001',
        message: 'Bot_' + String(index).padStart(3, '0') + ' 加入测试房间'
      });
    }
    rawEvents.push(
      {time: '2026-05-01T18:04:00.000Z', type: 'devour', botId: 'Bot_02', roomId: 'room_001', message: 'devour Bot_03'},
      {time: '2026-05-01T18:04:01.000Z', type: '被 devour', botId: 'Bot_03', roomId: 'room_001', message: '被 Bot_02 devour'},
      {time: '2026-05-01T18:04:02.000Z', type: 'body part pickup', botId: 'Bot_02', roomId: 'room_001', message: '捡到 Map Heart'},
      {time: '2026-05-01T18:04:03.000Z', type: 'body complete', botId: 'Bot_02', roomId: 'room_001', message: '完成身体'},
      {time: '2026-05-01T18:04:04.000Z', type: '进入结算', botId: 'Bot_02', roomId: 'room_001', message: '收到 settlement', data: {endedReason: 'body_complete'}},
      {time: '2026-05-01T18:04:05.000Z', type: '结算完成', botId: 'Bot_02', roomId: 'room_001', message: '测试结果已记录', data: {endedReason: 'body_complete'}}
    );

    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      completedSettlement: true,
      rawEvents,
      bots: [{botId: 'Bot_01', state: 'Finished'}]
    });

    expect(markdown).to.contain('devour Bot_03');
    expect(markdown).to.contain('被 Bot_02 devour');
    expect(markdown).to.contain('捡到 Map Heart');
    expect(markdown).to.contain('完成身体');
    expect(markdown).to.contain('收到 settlement，endedReason=body_complete');
    expect(markdown).to.contain('测试结果已记录，endedReason=body_complete');
  });

  it('should keep every required human-like battle category when the timeline is capped', () => {
    const rawEvents = [
      {time: '2026-05-01T18:00:00.000Z', type: '连接服务器', botId: 'Bot_01', roomId: 'room_001', message: '开始连接 http://game.local', data: {socketType: 'player'}},
      {time: '2026-05-01T18:00:01.000Z', type: '进入大厅', botId: 'Bot_01', roomId: 'room_001', message: '发送 respawn 请求'},
      {time: '2026-05-01T18:00:02.000Z', type: '请求开始游戏', botId: 'Bot_01', roomId: 'room_001', message: '收到 welcome，准备提交 gotit'},
      {time: '2026-05-01T18:00:03.000Z', type: '确认身体', botId: 'Bot_01', roomId: 'room_001', message: 'gotit 已发送，等待房间倒计时'}
    ];
    for (let index = 0; index < 180; index += 1) {
      rawEvents.push({
        time: new Date(Date.UTC(2026, 4, 1, 18, 1, index)).toISOString(),
        type: '玩家加入',
        roomId: 'room_001',
        message: 'Noise_' + String(index).padStart(3, '0') + ' 加入测试房间'
      });
    }
    rawEvents.push(
      {time: '2026-05-01T18:05:00.000Z', type: '倒计时开始', roomId: 'room_001', message: '5 秒'},
      {time: '2026-05-01T18:05:05.000Z', type: '战斗开始', roomId: 'room_001', message: '玩家数=8'},
      {time: '2026-05-01T18:05:06.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '移动追资源', data: {targetSource: '可见食物', targetX: 10, targetY: 20}},
      {time: '2026-05-01T18:05:07.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '随机移动', data: {targetSource: '随机巡航', targetX: 30, targetY: 40}},
      {time: '2026-05-01T18:05:08.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '避让大玩家', data: {targetSource: '避让大玩家', targetX: 50, targetY: 60}},
      {time: '2026-05-01T18:05:09.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '追击小玩家', data: {targetSource: '追击小玩家', targetX: 70, targetY: 80}},
      {time: '2026-05-01T18:05:10.000Z', type: '战斗行为', botId: 'Bot_01', roomId: 'room_001', message: '追 part loot', data: {targetSource: 'part loot', targetX: 90, targetY: 100}},
      {time: '2026-05-01T18:05:11.000Z', type: 'ghost 出现/遭遇', botId: 'Bot_01', roomId: 'room_001', message: 'ghost 出现，改向移动', data: {targetSource: 'ghost', targetX: 110, targetY: 120}},
      {time: '2026-05-01T18:05:12.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行吐孢子'},
      {time: '2026-05-01T18:05:13.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行分裂'},
      {time: '2026-05-01T18:05:14.000Z', type: '战斗技能', botId: 'Bot_01', roomId: 'room_001', message: '执行连接尝试'},
      {time: '2026-05-01T18:05:15.000Z', type: '局内聊天', botId: 'Bot_01', roomId: 'room_001', message: '我去那边看看'},
      {time: '2026-05-01T18:05:16.000Z', type: 'devour', botId: 'Bot_01', roomId: 'room_001', message: 'devour Bot_02'},
      {time: '2026-05-01T18:05:17.000Z', type: '被 devour', botId: 'Bot_01', roomId: 'room_001', message: '被 Bot_03 devour'},
      {time: '2026-05-01T18:05:18.000Z', type: 'body part pickup', botId: 'Bot_01', roomId: 'room_001', message: '捡到 Map Heart'},
      {time: '2026-05-01T18:05:19.000Z', type: 'body complete', botId: 'Bot_01', roomId: 'room_001', message: '完成身体'},
      {time: '2026-05-01T18:05:20.000Z', type: '进入结算', botId: 'Bot_01', roomId: 'room_001', message: '收到 settlement', data: {endedReason: 'body_complete'}},
      {time: '2026-05-01T18:05:21.000Z', type: '结算完成', botId: 'Bot_01', roomId: 'room_001', message: '测试结果已记录', data: {endedReason: 'body_complete'}}
    );

    const markdown = generateSummaryMarkdown({
      roomId: 'room_001',
      completedSettlement: true,
      rawEvents,
      bots: [{botId: 'Bot_01', state: 'Finished'}]
    });

    [
      '5 秒',
      '战斗开始：玩家数=8',
      '移动追资源（可见食物）',
      '随机移动（随机巡航）',
      '避让大玩家',
      '追击小玩家',
      '追 part loot（part loot）',
      'ghost 出现，改向移动',
      '执行吐孢子',
      '执行分裂',
      '执行连接尝试',
      '局内聊天：我去那边看看',
      'devour Bot_02',
      '被 Bot_03 devour',
      '捡到 Map Heart',
      '完成身体',
      '收到 settlement，endedReason=body_complete',
      '测试结果已记录，endedReason=body_complete'
    ].forEach((text) => {
      expect(markdown).to.contain(text);
    });
  });

  it('should preserve full raw_events.jsonl data when writing summary', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-report-'));
    const rawPath = path.join(root, 'raw_events.jsonl');
    const rawEvents = [
      {
        time: '2026-05-01T18:00:21.000Z',
        type: 'body part pickup',
        botId: 'Bot_01',
        roomId: 'room_001',
        message: '捡到藤蔓手',
        data: {
          nested: {partId: 'hand_left_option_01', sourceType: 'ghost_echo'},
          numbers: [1, 2, 3]
        }
      }
    ];
    writeJsonl(rawPath, rawEvents);

    writeSummary(root, {
      roomId: 'room_001',
      completedSettlement: true,
      bots: [{botId: 'Bot_01', state: 'Finished'}]
    });

    const preserved = fs.readFileSync(rawPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    expect(preserved).to.deep.equal(rawEvents);
  });
});
