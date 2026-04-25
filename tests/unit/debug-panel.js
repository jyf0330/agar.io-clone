/*jshint expr:true */

const expect = require('chai').expect;
const debugPanel = require('../../apps/client/src/debug-panel');

describe('debug-panel.js', () => {
  it('should render Chinese diagnostics for runtime, socket, world, and modules', () => {
    const state = debugPanel.createDebugState(1000);
    debugPanel.recordLog(state, '收到 welcome，地图 2000x2000', 'ok', 1100);
    debugPanel.markSocketEvent(state, 'serverTellPlayerMove', 1200);
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
    expect(html).to.contain('最近事件：serverTellPlayerMove');
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
});
