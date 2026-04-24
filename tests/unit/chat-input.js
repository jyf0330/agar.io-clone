/*jshint expr:true */

const expect = require('chai').expect;
const createChatInput = require('../../apps/client/src/ui/chat-input');

function createElement(tagName) {
  return {
    tagName: tagName,
    className: '',
    type: '',
    textContent: '',
    value: '',
    children: [],
    listeners: {},
    classList: {
      remove() {},
      add() {},
      contains() {
        return false;
      }
    },
    appendChild(child) {
      this.children.push(child);
      this.firstChild = this.children[0] || null;
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
      this.firstChild = this.children[0] || null;
    },
    addEventListener(eventName, handler) {
      this.listeners[eventName] = handler;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    focus() {},
    blur() {}
  };
}

function findByClass(node, className) {
  if (!node) {
    return null;
  }
  if (node.className === className) {
    return node;
  }

  return (node.children || []).reduce((match, child) => {
    return match || findByClass(child, className);
  }, null);
}

describe('chat-input.js', () => {
  it('should expose five quick pet question buttons and send their text', () => {
    const wrapper = createElement('div');
    const document = {
      body: wrapper,
      createElement: createElement,
      getElementById(id) {
        return id === 'gameAreaWrapper' ? wrapper : null;
      }
    };
    const sent = [];
    const chatInput = createChatInput({document: document});

    chatInput.setSendHandler((text) => {
      sent.push(text);
      return true;
    });
    chatInput.show();

    const quickBar = findByClass(wrapper, 'npc-chat-quickbar');
    expect(quickBar.children.length).to.equal(5);
    expect(quickBar.children.map((button) => button.textContent)).to.include('哪里有回声？');

    quickBar.children[0].listeners.click();

    expect(sent).to.deep.equal(['哪里有回声？']);
    expect(chatInput.getLocalMessages()).to.deep.equal(['哪里有回声？']);
  });
});
