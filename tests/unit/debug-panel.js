/*jshint expr:true */

const expect = require('chai').expect;
const debugPanel = require('../../apps/client/src/debug-panel');

describe('debug-panel.js', () => {
  it('should render Chinese diagnostics for runtime, socket, world, and modules', () => {
    const state = debugPanel.createDebugState(1000);
    debugPanel.recordLog(state, '收到 welcome，地图 2000x2000', 'ok', 1100);
    debugPanel.markSocketEvent(state, 'serverTellPlayerMove', 1200);
    debugPanel.markSocketEvent(state, 'leaderboard', 1300);
    debugPanel.updateState(state, {
      now: 1400,
      frame: {
        fps: 55,
        frameMs: 18
      },
      socket: {
        connected: true,
        latencyMs: 42
      },
      game: {
        started: true,
        playerType: 'player'
      },
      world: {
        players: 3,
        cells: 5,
        foods: 120,
        fireFood: 2,
        viruses: 4,
        partLoot: 1,
        ghosts: 2
      },
      modules: {
        npc: true,
        chat: true,
        body: true,
        pet: false,
        ghostDebug: true,
        materialization: true,
        connection: false,
        playerCard: true
      }
    });

    const html = debugPanel.formatDebugPanel(state);

    expect(html).to.contain('调试面板');
    expect(html).to.contain('运行状态：游戏中 / player');
    expect(html).to.contain('帧率：55 FPS / 18ms');
    expect(html).to.contain('Socket：已连接');
    expect(html).to.contain('延迟：42ms');
    expect(html).to.contain('最近事件：leaderboard');
    expect(html).to.not.contain('最近事件：serverTellPlayerMove');
    expect(html).to.contain('玩家 3 / 细胞 5 / 食物 120 / 喷射 2 / 病毒 4 / 部位 1 / 回响 2');
    expect(html).to.contain('NPC：有输出');
    expect(html).to.contain('跟宠：未输出');
    expect(html).to.contain('收到 welcome，地图 2000x2000');
  });

  it('should call out possible stalls when movement updates are stale', () => {
    const state = debugPanel.createDebugState(1000);
    debugPanel.markSocketEvent(state, 'serverTellPlayerMove', 1000);
    debugPanel.updateState(state, {
      now: 4200,
      frame: {
        fps: 12,
        frameMs: 84
      },
      game: {
        started: true,
        playerType: 'player'
      },
      socket: {
        connected: true
      }
    });

    const html = debugPanel.formatDebugPanel(state);

    expect(html).to.contain('可能卡住：移动同步 3.2s 没有更新');
    expect(html).to.contain('渲染偏慢：12 FPS / 84ms');
  });

  it('should show the latest three non-movement socket events and drop older ones', () => {
    const state = debugPanel.createDebugState(1000);
    debugPanel.markSocketEvent(state, 'welcome', 1000);
    debugPanel.markSocketEvent(state, 'leaderboard', 1200);
    debugPanel.markSocketEvent(state, 'playerMetaUpdate', 1400);
    debugPanel.markSocketEvent(state, 'serverTellPlayerMove', 1600);
    debugPanel.markSocketEvent(state, 'npc:speak', 1800);
    debugPanel.updateState(state, { now: 2000 });

    const html = debugPanel.formatDebugPanel(state);

    expect(html).to.contain('最近事件');
    expect(html).to.contain('npc:speak');
    expect(html).to.contain('playerMetaUpdate');
    expect(html).to.contain('leaderboard');
    expect(html).to.not.contain('serverTellPlayerMove');
    expect(html).to.not.contain('welcome');
  });

  it('should format copyable plain text without html tags', () => {
    const state = debugPanel.createDebugState(1000);
    debugPanel.markSocketEvent(state, 'playerMetaUpdate', 1200);
    debugPanel.markSocketEvent(state, 'serverTellPlayerMove', 1400);
    debugPanel.recordLog(state, 'NPC 输出：Mochi 说话。', 'ok', 1600);
    debugPanel.updateState(state, {
      now: 1800,
      socket: {
        connected: true,
        latencyMs: 33
      }
    });

    const text = debugPanel.formatDebugPanelCopyText(state);

    expect(text).to.contain('调试面板');
    expect(text).to.contain('Socket：已连接 · 延迟：33ms');
    expect(text).to.contain('最近事件：playerMetaUpdate');
    expect(text).to.contain('playerMetaUpdate');
    expect(text).to.not.contain('serverTellPlayerMove');
    expect(text).to.contain('NPC 输出：Mochi 说话。');
    expect(text).to.not.contain('<div');
  });

  it('should record devour-window packet, metadata, handler, gap, and long-task probes', () => {
    const state = debugPanel.createDebugState(1000);

    debugPanel.startDevourProbe(state, 'Alice', 1000);
    debugPanel.recordMovementPayload(state, {
      players: 3,
      cells: 5,
      foods: 120,
      fireFood: 2,
      viruses: 4,
      partLoot: 6,
      ghosts: 1
    }, 22, 1100);
    debugPanel.recordMetaPayload(state, {
      items: 3,
      bodyParts: 12
    }, 17, 1160);
    debugPanel.recordHandlerTiming(state, 'settlement', 58, 1220);
    debugPanel.recordDevourMilestone(state, 'settlement', 1250);
    debugPanel.recordLongTask(state, 91, 1300);
    debugPanel.updateState(state, { now: 1400 });

    const html = debugPanel.formatDebugPanel(state);
    const text = debugPanel.formatDebugPanelCopyText(state);

    expect(html).to.contain('吞噬探针');
    expect(html).to.contain('同步包 1');
    expect(html).to.contain('Meta 1');
    expect(html).to.contain('最近同步：玩家 3 / 细胞 5 / 食物 120 / 喷射 2 / 病毒 4 / 部位 6 / 回响 1 / handler 22ms');
    expect(html).to.contain('最近元数据：条目 3 / 部位 12 / handler 17ms');
    expect(html).to.contain('playerDied → settlement 250ms');
    expect(html).to.contain('long task 91ms');
    expect(text).to.contain('吞噬探针：Alice');
    expect(text).to.contain('同步包 1 / Meta 1');
    expect(text).to.contain('最近慢事件：settlement 58ms');
  });
});
