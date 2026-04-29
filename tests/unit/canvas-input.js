/*jshint expr:true */

const expect = require('chai').expect;

function loadCanvasWithDom(document, window) {
    global.document = document;
    global.window = window;
    delete require.cache[require.resolve('../../apps/client/src/global')];
    delete require.cache[require.resolve('../../apps/client/src/canvas')];
    const gameGlobal = require('../../apps/client/src/global');
    gameGlobal.screen = {width: 800, height: 600};
    gameGlobal.target = {x: 0, y: 0};
    gameGlobal.socket = {
        connected: true,
        emitted: [],
        emit(eventName, payload) {
            this.emitted.push({eventName: eventName, payload: payload});
        }
    };
    return {
        Canvas: require('../../apps/client/src/canvas'),
        gameGlobal: gameGlobal
    };
}

function createCanvasElement() {
    return {
        width: 0,
        height: 0,
        parent: null,
        listeners: {},
        addEventListener(eventName, handler) {
            this.listeners[eventName] = handler;
        }
    };
}

describe('canvas.js', () => {
    afterEach(() => {
        delete global.document;
        delete global.window;
    });

    it('should update target from mouse movement and reset it when continuity is disabled', () => {
        const canvasEl = createCanvasElement();
        const document = {
            getElementById(id) {
                return id === 'cvs' ? canvasEl : null;
            }
        };
        const {Canvas, gameGlobal} = loadCanvasWithDom(document, {innerWidth: 800, innerHeight: 600});
        const canvas = new Canvas();

        canvasEl.listeners.mousemove.call(canvasEl, {clientX: 500, clientY: 350});
        expect(canvas.target).to.deep.equal({x: 100, y: 50});
        expect(gameGlobal.target).to.deep.equal({x: 100, y: 50});

        gameGlobal.continuity = false;
        canvasEl.listeners.mouseout.call(canvasEl);
        expect(canvas.target).to.deep.equal({x: 0, y: 0});
        expect(gameGlobal.target).to.deep.equal({x: 0, y: 0});
    });

    it('should emit split, feed, and connect commands from key input', () => {
        const splitSound = {played: 0, play() { this.played += 1; }};
        const canvasEl = createCanvasElement();
        const document = {
            getElementById(id) {
                if (id === 'cvs') {
                    return canvasEl;
                }
                if (id === 'split_cell') {
                    return splitSound;
                }
                return null;
            }
        };
        const {Canvas, gameGlobal} = loadCanvasWithDom(document, {innerWidth: 800, innerHeight: 600});
        const canvas = new Canvas();

        canvasEl.listeners.keypress.call(canvasEl, {which: gameGlobal.KEY_FIREFOOD});
        canvasEl.listeners.keyup.call(canvasEl, {which: gameGlobal.KEY_FIREFOOD});
        canvasEl.listeners.keypress.call(canvasEl, {which: gameGlobal.KEY_SPLIT});
        canvasEl.listeners.keyup.call(canvasEl, {which: gameGlobal.KEY_SPLIT});
        canvasEl.listeners.keypress.call(canvasEl, {which: gameGlobal.KEY_CONNECT});

        expect(gameGlobal.socket.emitted.map((entry) => entry.eventName)).to.deep.equal(['1', '2', '3']);
        expect(splitSound.played).to.equal(1);
        expect(canvas.reenviar).to.equal(false);
    });
});
