/*jshint expr:true */

const expect = require('chai').expect;
const render = require('../../apps/client/src/render');

describe('render avatar', () => {
  it('should prefer npc skeleton images over legacy preview images', () => {
    const drawn = [];
    const graph = {
      save() {},
      restore() {},
      beginPath() {},
      closePath() {},
      arc() {},
      fill() {},
      stroke() {},
      clip() {},
      strokeText() {},
      fillText() {},
      drawImage(image, x, y, width, height) {
        drawn.push({ image, x, y, width, height });
      }
    };

    render.drawCells([{
      x: 100,
      y: 100,
      radius: 40,
      mass: 50,
      name: 'Robot',
      color: '#fff',
      borderColor: '#000',
      isNpc: true,
      skeletonKey: 'skeleton-b-blob',
      playerCardPreviewDataUrl: 'data:image/png;base64,old'
    }], {
      textBorderSize: 1,
      textColor: '#fff',
      textBorder: '#000'
    }, 0, {
      left: 0,
      right: 500,
      top: 0,
      bottom: 500
    }, graph);

    expect(drawn).to.have.length(1);
    expect(drawn[0].image.skeletonKey).to.equal('b');
  });

  it('should draw the body part count above the player cell', () => {
    const texts = [];
    const graph = {
      save() {},
      restore() {},
      beginPath() {},
      closePath() {},
      arc() {},
      fill() {},
      stroke() {},
      strokeText(text, x, y) { texts.push({ type: 'stroke', text, x, y }); },
      fillText(text, x, y) { texts.push({ type: 'fill', text, x, y }); }
    };

    render.drawCells([{
      x: 100,
      y: 100,
      radius: 40,
      mass: 50,
      name: 'Alice',
      color: '#fff',
      borderColor: '#000',
      bodyPartCount: 6
    }], {
      textBorderSize: 1,
      textColor: '#fff',
      textBorder: '#000'
    }, 0, {
      left: 0,
      right: 500,
      top: 0,
      bottom: 500
    }, graph);

    const partLabel = texts.find((entry) => entry.type === 'fill' && entry.text === '部件 6');

    expect(partLabel).to.not.equal(undefined);
    expect(partLabel.y).to.be.lessThan(60);
  });

  it('should blink only the local player while invincible', () => {
    const originalNow = Date.now;
    const stack = [];
    const textAlphas = [];
    const graph = {
      globalAlpha: 1,
      save() {
        stack.push({globalAlpha: this.globalAlpha});
      },
      restore() {
        const previous = stack.pop();
        this.globalAlpha = previous ? previous.globalAlpha : 1;
      },
      beginPath() {},
      closePath() {},
      arc() {},
      fill() {},
      stroke() {},
      strokeText(text) {
        textAlphas.push({type: 'stroke', text, alpha: this.globalAlpha});
      },
      fillText(text) {
        textAlphas.push({type: 'fill', text, alpha: this.globalAlpha});
      }
    };

    try {
      Date.now = () => 160;
      render.drawCells([{
        x: 100,
        y: 100,
        radius: 40,
        mass: 50,
        name: 'Alice',
        color: '#fff',
        borderColor: '#000',
        isSelf: true,
        invincibleUntil: 0,
        isInvincible: true
      }, {
        x: 220,
        y: 100,
        radius: 40,
        mass: 50,
        name: 'Bob',
        color: '#fff',
        borderColor: '#000',
        isSelf: false,
        invincibleUntil: 0,
        isInvincible: true
      }], {
        textBorderSize: 1,
        textColor: '#fff',
        textBorder: '#000'
      }, 0, {
        left: 0,
        right: 500,
        top: 0,
        bottom: 500
      }, graph);
    } finally {
      Date.now = originalNow;
    }

    const aliceLabel = textAlphas.find((entry) => entry.type === 'fill' && entry.text === 'Alice');
    const bobLabel = textAlphas.find((entry) => entry.type === 'fill' && entry.text === 'Bob');

    expect(aliceLabel.alpha).to.be.lessThan(1);
    expect(bobLabel.alpha).to.equal(1);
  });
});
