/*jshint expr:true */

const expect = require('chai').expect;
const createPaintToast = require('../../apps/client/src/ui/paint-toast');

function createElement(tagName) {
    return {
        tagName: tagName,
        className: '',
        textContent: '',
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

describe('paint-toast.js', () => {
    it('should show a paint toast, fade it, and remove it after the ttl', () => {
        const timeouts = [];
        const wrapper = createElement('div');
        const document = {
            body: createElement('body'),
            createElement: createElement,
            getElementById(id) {
                return id === 'gameAreaWrapper' ? wrapper : null;
            }
        };
        const window = {
            setTimeout(callback, delay) {
                timeouts.push({callback: callback, delay: delay});
            }
        };
        const toast = createPaintToast({document: document, window: window});

        toast.show('Mochi painted your card', 500);

        const layer = wrapper.children[0];
        const node = layer.children[0];
        expect(layer.className).to.equal('npc-paint-toast-layer');
        expect(node.className).to.equal('npc-paint-toast');
        expect(node.textContent).to.equal('Mochi painted your card');
        expect(timeouts.map((entry) => entry.delay)).to.deep.equal([280, 500]);

        timeouts[0].callback();
        expect(node.className).to.equal('npc-paint-toast is-fading');

        timeouts[1].callback();
        expect(layer.children).to.have.length(0);
    });
});
