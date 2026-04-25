/*jshint expr:true */

const expect = require('chai').expect;
const createBodyInventoryPanel = require('../../apps/client/src/ui/body-inventory-panel');

function createElement(tagName) {
  const element = {
    tagName: tagName,
    id: '',
    className: '',
    textContent: '',
    innerHTML: '',
    children: [],
    listeners: {},
    style: {},
    classList: {
      remove(className) {
        this.owner.className = this.owner.className.replace(className, '').replace(/\s+/g, ' ').trim();
      },
      add(className) {
        if (this.owner.className.indexOf(className) === -1) {
          this.owner.className = (this.owner.className + ' ' + className).trim();
        }
      },
      contains(className) {
        return this.owner.className.split(/\s+/).indexOf(className) !== -1;
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
      return child;
    },
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    },
    click() {
      if (this.listeners.click) {
        this.listeners.click();
      }
    }
  };
  element.classList.owner = element;
  return element;
}

function collectText(element) {
  return [element.textContent].concat((element.children || []).map(collectText)).join('\n');
}

describe('body-inventory-panel.js', () => {
  it('should render collected parts with source and attributes', () => {
    const elements = {};
    const document = {
      body: createElement('body'),
      createElement: createElement,
      getElementById(id) {
        return elements[id] || null;
      }
    };
    elements.bodyInventoryButton = createElement('button');
    elements.bodyInventoryPanel = createElement('div');
    elements.bodyInventoryList = createElement('div');
    elements.bodyInventoryCloseButton = createElement('button');
    elements.bodyInventoryPanel.appendChild(elements.bodyInventoryList);

    const panel = createBodyInventoryPanel({
      document: document,
      getPlayer() {
        return {
          bodyParts: [{
            partType: 'HAND',
            displayName: 'Thread Hand',
            sourceType: 'map_pickup',
            templateId: 'hand-thread',
            stats: { pickupRange: 10 },
            signatureBonus: { connectionRangeBonus: 15 }
          }]
        };
      }
    });

    panel.update();
    elements.bodyInventoryButton.click();

    const text = collectText(elements.bodyInventoryList);
    expect(elements.bodyInventoryPanel.className).to.not.contain('is-hidden');
    expect(text).to.contain('Thread Hand');
    expect(text).to.contain('HAND');
    expect(text).to.contain('来源：map_pickup');
    expect(text).to.contain('pickupRange +10');
    expect(text).to.contain('connectionRangeBonus +15');
  });

  it('should avoid rebuilding the hidden detail list during routine HUD updates', () => {
    const elements = {};
    let partCount = 1;
    const document = {
      body: createElement('body'),
      createElement: createElement,
      getElementById(id) {
        return elements[id] || null;
      }
    };
    elements.bodyInventoryButton = createElement('button');
    elements.bodyInventoryPanel = createElement('div');
    elements.bodyInventoryList = createElement('div');
    elements.bodyInventoryCloseButton = createElement('button');
    elements.bodyInventoryPanel.appendChild(elements.bodyInventoryList);

    const panel = createBodyInventoryPanel({
      document: document,
      getPlayer() {
        return {
          bodyParts: Array.from({length: partCount}).map((_, index) => ({
            partType: 'HAND',
            templateId: 'hand-' + index
          }))
        };
      }
    });

    panel.update();
    partCount = 3;
    panel.update();

    expect(elements.bodyInventoryButton.textContent).to.equal('部位 3');
    expect(elements.bodyInventoryList.children).to.have.length(0);

    elements.bodyInventoryButton.click();

    expect(elements.bodyInventoryList.children).to.have.length(3);
  });

  it('should show an empty state when opened with no parts available', () => {
    const elements = {};
    const document = {
      body: createElement('body'),
      createElement: createElement,
      getElementById(id) {
        return elements[id] || null;
      }
    };
    elements.bodyInventoryButton = createElement('button');
    elements.bodyInventoryPanel = createElement('div');
    elements.bodyInventoryList = createElement('div');
    elements.bodyInventoryCloseButton = createElement('button');
    elements.bodyInventoryPanel.appendChild(elements.bodyInventoryList);

    createBodyInventoryPanel({
      document: document,
      getPlayer() {
        return { bodyParts: [] };
      }
    });

    elements.bodyInventoryButton.click();

    expect(elements.bodyInventoryList.children[0].textContent).to.equal('还没有吞到部位。');
  });
});
