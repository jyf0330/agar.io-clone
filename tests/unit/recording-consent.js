/*jshint expr:true */

const expect = require('chai').expect;
const createSocketController = require('../../apps/client/src/socket-controller');
const playerUtils = require('../../apps/server/src/map/player');

function createFakeSocket() {
  const handlers = {};
  const emitted = [];

  return {
    disconnected: false,
    active: true,
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

function createController(globalOverrides) {
  const socket = createFakeSocket();
  const global = Object.assign({
    playerName: 'recorder',
    playerType: 'player',
    playerCard: null,
    bodySignature: null,
    consentToRecord: true,
    gameStart: false,
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
  }, globalOverrides || {});

  const controller = createSocketController({
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
    global,
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
    getChat() {
      return {
        addSystemLine() {},
        addChatLine() {},
        registerFunctions() {}
      };
    },
    getPlayer() {
      return {};
    },
    getCanvasTarget() {
      return {x: 0, y: 0};
    },
    getPlayerCardPreviewDataUrl() {
      return null;
    },
    assignSocket() {},
    renderPlayerCardPreviews() {},
    renderStatusPanel() {},
    resize() {},
    setLeaderboard() {},
    setPlayer() {},
    setWorldState() {}
  });

  return {controller, socket};
}

describe('recording consent', () => {
  it('should include the pregame consent flag in the gotit payload', () => {
    const {controller, socket} = createController({consentToRecord: false});

    controller.connect('player');
    socket.handlers.welcome({id: 'player-1'}, {width: 2000, height: 2000});

    const gotit = socket.emitted.find((entry) => entry.eventName === 'gotit');
    expect(gotit.payload.consentToRecord).to.equal(false);
    expect(gotit.payload.isReplayAllowed).to.equal(false);
  });

  it('should store consent and replay eligibility on the server player', () => {
    const player = new playerUtils.Player('player-1');

    player.clientProvidedData({
      name: 'archivist',
      screenWidth: 800,
      screenHeight: 600,
      consentToRecord: false
    });

    expect(player.consentToRecord).to.equal(false);
    expect(player.isReplayAllowed).to.equal(false);
  });
});
