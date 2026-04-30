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
});
