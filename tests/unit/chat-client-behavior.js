/*jshint expr:true */

const expect = require('chai').expect;

function createElement(tagName) {
    return {
        tagName: tagName,
        value: '',
        className: '',
        innerHTML: '',
        childNodes: [],
        listeners: {},
        addEventListener(eventName, handler) {
            this.listeners[eventName] = handler;
        },
        appendChild(child) {
            this.childNodes.push(child);
            return child;
        },
        removeChild(child) {
            this.childNodes = this.childNodes.filter((entry) => entry !== child);
            return child;
        },
        focusCount: 0,
        focus() {
            this.focusCount += 1;
        }
    };
}

function loadChatClientWithDom(document, window) {
    global.document = document;
    global.window = window;
    delete require.cache[require.resolve('../../apps/client/src/global')];
    delete require.cache[require.resolve('../../apps/client/src/chat-client')];
    const gameGlobal = require('../../apps/client/src/global');
    gameGlobal.canvas = {cv: createElement('canvas')};
    gameGlobal.socket = {
        connected: true,
        emitted: [],
        emit(eventName, payload) {
            this.emitted.push({eventName: eventName, payload: payload});
        }
    };
    gameGlobal.mobile = false;
    gameGlobal.player = {name: 'Tester'};
    return {
        ChatClient: require('../../apps/client/src/chat-client'),
        gameGlobal: gameGlobal
    };
}

describe('chat-client.js', () => {
    afterEach(() => {
        delete global.document;
        delete global.window;
    });

    it('should strip html before emitting player chat and appending the local line', () => {
        const input = createElement('input');
        const chatList = createElement('ul');
        const document = {
            createElement: createElement,
            getElementById(id) {
                return id === 'chatInput' ? input : chatList;
            }
        };
        const {ChatClient, gameGlobal} = loadChatClientWithDom(document, {innerWidth: 800, innerHeight: 600});
        const chat = new ChatClient();

        const sent = chat.sendChatText('hello <b>world</b>');

        expect(sent).to.equal(true);
        expect(gameGlobal.socket.emitted).to.deep.equal([{
            eventName: 'player:chat',
            payload: {sender: 'Tester', message: 'hello world'}
        }]);
        expect(chatList.childNodes[0].className).to.equal('me');
        expect(chatList.childNodes[0].innerHTML).to.equal('<b>Tester</b>: hello world');
    });

    it('should execute registered commands without sending player chat', () => {
        const input = createElement('input');
        const chatList = createElement('ul');
        const document = {
            createElement: createElement,
            getElementById(id) {
                return id === 'chatInput' ? input : chatList;
            }
        };
        const {ChatClient, gameGlobal} = loadChatClientWithDom(document, {innerWidth: 800, innerHeight: 600});
        const chat = new ChatClient();
        let argsSeen = null;
        chat.registerCommand('pet', 'Switch pet.', function (args) {
            argsSeen = args;
        });

        const sent = chat.sendChatText('-pet doudou');

        expect(sent).to.equal(true);
        expect(argsSeen).to.deep.equal(['doudou']);
        expect(gameGlobal.socket.emitted).to.deep.equal([]);
    });
});
