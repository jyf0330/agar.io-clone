/*jshint expr:true */

const expect = require('chai').expect;
const createSpeechBubble = require('../../apps/client/src/ui/speech-bubble');

function createElement(tagName) {
    return {
        tagName: tagName,
        className: '',
        textContent: '',
        style: {},
        children: [],
        parentNode: null,
        appendChild(child) {
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        removeChild(child) {
            this.children = this.children.filter((entry) => entry !== child);
            child.parentNode = null;
            return child;
        }
    };
}

describe('speech-bubble.js', () => {
    let originalDateNow;

    beforeEach(() => {
        originalDateNow = Date.now;
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    it('should position recent npc speech above the matching visible npc', () => {
        const body = createElement('body');
        const wrapper = createElement('div');
        body.appendChild(wrapper);
        const document = {
            body: body,
            createElement: createElement,
            getElementById(id) {
                return id === 'gameAreaWrapper' ? wrapper : null;
            }
        };
        Date.now = () => 1000;
        const speechBubble = createSpeechBubble({document: document});

        speechBubble.show('mochi', '跟我来', 3000);
        speechBubble.render([
            {id: 'npc-1', npcId: 'mochi', cells: [{x: 130, y: 170, radius: 20}]}
        ], {x: 100, y: 120}, {width: 800, height: 600});

        const layer = wrapper.children[0];
        const bubble = layer.children[0];
        expect(layer.className).to.equal('npc-speech-layer');
        expect(bubble.className).to.equal('npc-speech-bubble');
        expect(bubble.textContent).to.equal('跟我来');
        expect(bubble.style.left).to.equal('430px');
        expect(bubble.style.top).to.equal('286px');
        expect(bubble.style.opacity).to.equal('1');
    });

    it('should prune expired bubbles on render', () => {
        const body = createElement('body');
        const document = {
            body: body,
            createElement: createElement,
            getElementById() {
                return null;
            }
        };
        Date.now = () => 1000;
        const speechBubble = createSpeechBubble({document: document});

        speechBubble.show('mochi', '旧消息', 100);
        expect(body.children[0].children).to.have.length(1);

        Date.now = () => 1200;
        speechBubble.render([], {x: 0, y: 0}, {width: 800, height: 600});

        expect(body.children[0].children).to.have.length(0);
    });
});
