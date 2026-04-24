/*jshint expr:true */

const expect = require('chai').expect;
const createSettlementPanel = require('../../apps/client/src/ui/settlement-panel');

function createElement(tagName) {
  return {
    tagName: tagName,
    className: '',
    textContent: '',
    children: [],
    classList: {
      remove() {},
      add() {}
    },
    appendChild(child) {
      this.children.push(child);
      this.firstChild = this.children[0] || null;
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((entry) => entry !== child);
      this.firstChild = this.children[0] || null;
    }
  };
}

describe('settlement-panel.js', () => {
  it('should render a body source list with history status', () => {
    const wrapper = createElement('div');
    const document = {
      body: wrapper,
      createElement: createElement,
      getElementById(id) {
        return id === 'gameAreaWrapper' ? wrapper : null;
      }
    };
    const panel = createSettlementPanel({document: document});

    panel.show({
      endedReason: 'swallowed',
      historyWritten: true,
      keyEvents: [{
        eventType: 'picked',
        displayName: 'Thread Hand',
        sourceType: 'ghost_echo',
        x: 120,
        y: 130
      }],
      bodyParts: [{
        partType: 'HAND',
        displayName: 'Thread Hand',
        stats: ['pickupRange +10'],
        sourceType: 'ghost_echo',
        originPlayerName: 'Old Player',
        acquired: 'picked from map'
      }]
    });

    expect(wrapper.children[0].children.map((child) => child.textContent).join('\n')).to.contain('Body Sources');
    expect(wrapper.children[0].children.map((child) => child.textContent).join('\n')).to.contain('Thread Hand');
    expect(wrapper.children[0].children.map((child) => child.textContent).join('\n')).to.contain('Key Events');
    expect(wrapper.children[0].children.map((child) => child.textContent).join('\n')).to.contain('picked | Thread Hand | ghost_echo @ 120,130');
    expect(wrapper.children[0].children.map((child) => child.textContent).join('\n')).to.contain('entered the history library');
    expect(wrapper.children[0].children.map((child) => child.textContent).join('\n')).to.contain('future historical echo');
  });
});
