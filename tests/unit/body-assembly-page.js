/*jshint expr:true */

const expect = require('chai').expect;
const createBodyAssemblyPage = require('../../apps/client/src/body-assembly/body-assembly-page');

function createElement(tagName) {
  const element = {
    tagName: tagName,
    className: '',
    textContent: '',
    innerHTML: '',
    children: [],
    attributes: {},
    listeners: {},
    style: {},
    disabled: false,
    classList: {
      add(className) {
        if (this.owner.className.split(/\s+/).indexOf(className) === -1) {
          this.owner.className = (this.owner.className + ' ' + className).trim();
        }
      },
      remove(className) {
        this.owner.className = this.owner.className
          .split(/\s+/)
          .filter((entry) => entry && entry !== className)
          .join(' ');
      },
      contains(className) {
        return this.owner.className.split(/\s+/).indexOf(className) !== -1;
      },
      toggle(className, force) {
        if (force) {
          this.add(className);
        } else {
          this.remove(className);
        }
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener(name, handler) {
      this.listeners[name] = handler;
    },
    click() {
      if (this.listeners.click) {
        this.listeners.click({ preventDefault() {} });
      }
    }
  };
  element.classList.owner = element;
  return element;
}

function createDocument(elements) {
  return {
    createElement: createElement,
    getElementById(id) {
      return elements[id] || null;
    }
  };
}

describe('body-assembly-page.js', () => {
  it('should render one missing slot and only the selected missing part options', () => {
    const elements = {
      bodyAssemblyPanel: createElement('section'),
      bodyAssemblyPreview: createElement('div'),
      bodyAssemblyMissingPart: createElement('div'),
      bodyAssemblyOptionList: createElement('div'),
      bodyAssemblyStats: createElement('div'),
      bodyAssemblyConfirmButton: createElement('button'),
      bodyAssemblyStatus: createElement('div')
    };
    const confirmed = [];
    const entered = [];
    const page = createBodyAssemblyPage({
      document: createDocument(elements),
      randomMissingPart() {
        return 'leg_left';
      },
      saveSelectedBodyPart(config) {
        confirmed.push(config);
      },
      enterGameWithBodyConfig(config) {
        entered.push(config);
      }
    });

    page.open('player');

    expect(page.getState().missingPartType).to.equal('leg_left');
    expect(elements.bodyAssemblyPanel.className).to.contain('open');
    expect(elements.bodyAssemblyConfirmButton.disabled).to.equal(true);
    expect(elements.bodyAssemblyMissingPart.textContent).to.contain('左腿');
    expect(elements.bodyAssemblyPreview.children).to.have.length(6);
    expect(elements.bodyAssemblyPreview.children.filter((child) => child.className.indexOf('is-missing') !== -1)).to.have.length(1);
    expect(elements.bodyAssemblyOptionList.children).to.have.length(3);
    elements.bodyAssemblyOptionList.children.forEach((child) => {
      expect(child.getAttribute('data-part-type')).to.equal('leg_left');
    });

    elements.bodyAssemblyOptionList.children[1].click();
    expect(page.getState().selectedOption.id).to.equal('leg_left_option_02');
    expect(elements.bodyAssemblyConfirmButton.disabled).to.equal(false);
    expect(elements.bodyAssemblyStats.textContent).to.contain('stability');

    elements.bodyAssemblyConfirmButton.click();
    expect(elements.bodyAssemblyStatus.textContent).to.equal('身体已确认');
    expect(confirmed[0]).to.deep.include({
      missingPartType: 'leg_left'
    });
    expect(confirmed[0].selectedOption.id).to.equal('leg_left_option_02');
    expect(entered[0].missingPartType).to.equal('leg_left');
    expect(entered[0].selectedOption.id).to.equal('leg_left_option_02');
    expect(elements.bodyAssemblyPanel.className).to.not.contain('open');
  });
});
