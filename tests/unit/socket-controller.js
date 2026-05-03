/*jshint expr:true */

const expect = require('chai').expect;
const createSocketController = require('../../apps/client/src/socket-controller');

function createFakeSocket() {
  const handlers = {};
  const emitted = [];

  return {
    disconnected: false,
    active: true,
    connected: true,
    handlers,
    emitted,
    on(eventName, handler) {
      handlers[eventName] = handler;
    },
    emit(eventName, payload) {
      emitted.push({eventName, payload});
    },
    close() {
      this.disconnected = true;
    }
  };
}

function createController(overrides) {
  const socket = createFakeSocket();
  const player = Object.assign({
    id: 'player-1',
    name: 'local',
    activePet: null
  }, overrides && overrides.player);
  const calls = {
    debugLogs: [],
    chatLines: [],
    renders: 0,
    cardRenders: 0,
    toasts: 0,
    worldState: null
  };

  const controller = createSocketController(Object.assign({
    io: () => socket,
    document: {
      getElementById() {
        return {
          style: {},
          removeChild() {}
        };
      }
    },
    window: {
      setTimeout(callback) {
        callback();
      },
      cancelAnimationFrame() {}
    },
    global: {
      playerName: 'local',
      playerType: 'player',
      bodySignature: null,
      consentToRecord: true,
      gameStart: true,
      mobile: false,
      kicked: false,
      disconnected: false,
      startPingTime: Date.now(),
      screen: {
        width: 800,
        height: 600
      },
      game: {
        width: 0,
        height: 0
      }
    },
    render: {
      drawErrorMessage() {}
    },
    i18n: {
      t(key) {
        return key;
      }
    },
    graph: {},
    canvasElement: {
      focus() {}
    },
    debug() {},
    debugPanel: {
      markSocketEvent() {},
      update() {},
      log(message) {
        calls.debugLogs.push(message);
      }
    },
    getChat() {
      return {
        addSystemLine() {},
        addChatLine(sender, message) {
          calls.chatLines.push({sender, message});
        },
        registerFunctions() {}
      };
    },
    getPlayer() {
      return player;
    },
    getCanvasTarget() {
      return {x: 0, y: 0};
    },
    getPlayerCardPreviewDataUrl() {
      return null;
    },
    assignSocket() {},
    renderPlayerCardPreviews() {
      calls.cardRenders += 1;
    },
    renderStatusPanel() {
      calls.renders += 1;
    },
    resize() {},
    setLeaderboard() {},
    setPlayer() {},
    setWorldState(worldState) {
      calls.worldState = worldState;
    },
    paintToast: {
      show() {
        calls.toasts += 1;
      }
    }
  }, overrides && overrides.options));

  return {controller, socket, player, calls};
}

describe('socket-controller.js', () => {
  it('should not rerender HUD or log when player metadata is unchanged', () => {
    const {controller, socket, calls} = createController();
    const meta = [{
      id: 'player-1',
      name: 'local',
      bodyPartCount: 1,
      bodyPartCounts: {HAND: 1},
      activePet: {
        petId: 'mochi',
        npcId: 'mochi',
        name: 'Mochi'
      }
    }];

    controller.connect('player');
    calls.debugLogs.length = 0;
    socket.handlers.playerMetaUpdate(meta);
    socket.handlers.playerMetaUpdate(meta);

    expect(calls.renders).to.equal(1);
    expect(calls.cardRenders).to.equal(1);
    expect(calls.debugLogs).to.have.length(1);
  });

  it('should avoid full JSON stringify while comparing large player metadata', () => {
    const {controller, socket, calls} = createController();
    const originalStringify = JSON.stringify;
    const largePreview = 'data:image/png;base64,' + 'x'.repeat(50000);
    const meta = [{
      id: 'player-1',
      name: 'local',
      playerCardPreviewDataUrl: largePreview,
      bodyPartCount: 1,
      bodyPartCounts: {HAND: 1},
      activePet: {
        petId: 'mochi',
        npcId: 'mochi',
        name: 'Mochi'
      }
    }];

    controller.connect('player');
    calls.debugLogs.length = 0;

    JSON.stringify = function (value) {
      if (value && value.playerCardPreviewDataUrl === largePreview) {
        throw new Error('large metadata should not be stringified as one object');
      }
      return originalStringify.apply(JSON, arguments);
    };
    try {
      socket.handlers.playerMetaUpdate(meta);
      socket.handlers.playerMetaUpdate(meta.map((entry) => Object.assign({}, entry)));
    } finally {
      JSON.stringify = originalStringify;
    }

    expect(calls.renders).to.equal(1);
    expect(calls.cardRenders).to.equal(1);
    expect(calls.debugLogs).to.have.length(1);
  });

  it('should ignore npc paint events for other players', () => {
    const {controller, socket, player, calls} = createController();

    controller.connect('player');
    calls.debugLogs.length = 0;
    socket.handlers['npc:paint']({
      targetId: 'someone-else',
      previewDataUrl: 'data:image/png;base64,other',
      npcName: 'Mochi'
    });

    expect(player.playerCardPreviewDataUrl).to.equal(undefined);
    expect(calls.cardRenders).to.equal(0);
    expect(calls.toasts).to.equal(0);
    expect(calls.debugLogs).to.have.length(0);
  });

  it('should hide pet and ghost event surfaces by default', () => {
    const {controller, socket, player, calls} = createController();

    controller.connect('player');
    calls.debugLogs.length = 0;
    socket.handlers['npc:speak']({
      npcId: 'mochi',
      npcName: 'Mochi',
      text: '跟着你。'
    });
    socket.handlers['npc:paint']({
      targetId: 'player-1',
      previewDataUrl: 'data:image/png;base64,paint',
      npcName: 'Mochi'
    });

    expect(calls.chatLines).to.have.length(0);
    expect(calls.toasts).to.equal(0);
    expect(calls.cardRenders).to.equal(0);
    expect(calls.debugLogs).to.have.length(0);
    expect(player.playerCardPreviewDataUrl).to.equal(undefined);

    calls.cardRenders = 0;
    socket.handlers.serverTellPlayerMove(
      {id: 'player-1', cells: []},
      [{id: 'player-1', cells: []}],
      [],
      [],
      [],
      [],
      [{id: 'ghost-1'}]
    );
    expect(calls.worldState.ghosts).to.deep.equal([]);
  });

  it('should allow pet and ghost event surfaces when explicitly enabled', () => {
    const {controller, socket, player, calls} = createController({
      options: {
        showPetGhostEvents: true
      }
    });

    controller.connect('player');
    calls.debugLogs.length = 0;
    socket.handlers['npc:speak']({
      npcId: 'mochi',
      npcName: 'Mochi',
      text: '跟着你。'
    });
    socket.handlers['npc:paint']({
      targetId: 'player-1',
      previewDataUrl: 'data:image/png;base64,paint',
      npcName: 'Mochi'
    });

    expect(calls.chatLines[0]).to.deep.equal({
      sender: 'Mochi',
      message: '跟着你。'
    });
    expect(calls.toasts).to.equal(1);
    expect(calls.cardRenders).to.equal(1);
    expect(player.playerCardPreviewDataUrl).to.equal('data:image/png;base64,paint');

    calls.cardRenders = 0;
    socket.handlers.serverTellPlayerMove(
      {id: 'player-1', cells: []},
      [{id: 'player-1', cells: []}],
      [],
      [],
      [],
      [],
      [{id: 'ghost-1'}]
    );
    expect(calls.worldState.ghosts).to.deep.equal([{id: 'ghost-1'}]);
  });

  it('should hydrate spectator round timer from movement sync payloads', () => {
    const {controller, socket, player, calls} = createController({
      options: {
        global: {
          playerType: 'spectator'
        }
      }
    });

    controller.connect('spectator');
    socket.handlers.serverTellPlayerMove(
      {
        id: 'spectator-1',
        cells: [],
        roundTimer: {
          startedAt: 1000,
          durationMs: 480000,
          elapsedMs: 120000,
          remainingMs: 360000
        }
      },
      [],
      [],
      [],
      [],
      [],
      []
    );

    expect(player.roundTimer).to.deep.equal({
      startedAt: 1000,
      durationMs: 480000,
      elapsedMs: 120000,
      remainingMs: 360000
    });
    expect(calls.renders).to.equal(1);
  });

  it('should feed devour probe timings from socket events', () => {
    const probe = {
      started: '',
      movement: null,
      meta: null,
      timings: [],
      milestones: []
    };
    const debugPanel = {
      markSocketEvent() {},
      update() {},
      log() {},
      startDevourProbe(label) {
        probe.started = label;
      },
      recordMovementPayload(payload) {
        probe.movement = payload;
      },
      recordMetaPayload(payload) {
        probe.meta = payload;
      },
      recordHandlerTiming(name) {
        probe.timings.push(name);
      },
      recordDevourMilestone(name) {
        probe.milestones.push(name);
      }
    };
    const {controller, socket} = createController({
      options: {
        debugPanel: debugPanel
      }
    });

    controller.connect('player');
    socket.handlers.playerDied({playerEatenName: 'Bob'});
    socket.handlers.serverTellPlayerMove(
      {id: 'player-1', cells: []},
      [
        {id: 'player-1', cells: [{}, {}]},
        {id: 'player-2', cells: [{}]}
      ],
      [{}],
      [],
      [{}, {}],
      [{}, {}, {}],
      [{}]
    );
    socket.handlers.playerMetaUpdate([
      {id: 'player-1', bodyParts: [{}, {}]},
      {id: 'player-2', bodyParts: [{}]}
    ]);
    socket.handlers.settlement({});

    expect(probe.started).to.equal('Bob');
    expect(probe.movement).to.include({
      players: 2,
      cells: 3,
      foods: 1,
      viruses: 2,
      partLoot: 3,
      ghosts: 1
    });
    expect(probe.meta).to.deep.equal({
      items: 2,
      bodyParts: 3
    });
    expect(probe.timings).to.include('serverTellPlayerMove');
    expect(probe.timings).to.include('playerMetaUpdate');
    expect(probe.timings).to.include('settlement');
    expect(probe.milestones).to.include('settlement');
  });

  it('should respawn after a recoverable socket reconnect', () => {
    const {controller, socket, calls} = createController();

    controller.connect('player');
    socket.handlers.disconnect('transport close');
    socket.handlers.connect();

    expect(socket.emitted.map((entry) => entry.eventName)).to.deep.equal(['respawn', 'respawn']);
    expect(calls.debugLogs).to.include('Socket 已重新连接，正在恢复游戏。');
  });

  it('should not respawn after a server-initiated disconnect', () => {
    const {controller, socket} = createController();

    controller.connect('player');
    socket.handlers.disconnect('io server disconnect');
    socket.handlers.connect();

    expect(socket.emitted.map((entry) => entry.eventName)).to.deep.equal(['respawn']);
  });
});
