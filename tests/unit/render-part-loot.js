/*jshint expr:true */

const expect = require('chai').expect;
const render = require('../../apps/client/src/render');

describe('render part loot', () => {
  it('should draw a V5 part loot marker with its part type label', () => {
    const calls = [];
    const graph = {
      save() { calls.push(['save']); },
      restore() { calls.push(['restore']); },
      beginPath() { calls.push(['beginPath']); },
      moveTo(x, y) { calls.push(['moveTo', x, y]); },
      lineTo(x, y) { calls.push(['lineTo', x, y]); },
      closePath() { calls.push(['closePath']); },
      fill() { calls.push(['fill']); },
      stroke() { calls.push(['stroke']); },
      fillText(text, x, y) { calls.push(['fillText', text, x, y]); },
      strokeText(text, x, y) { calls.push(['strokeText', text, x, y]); }
    };

    render.drawPartLoot({ x: 50, y: 60 }, { part: { type: 'HAND' }, radius: 28 }, graph);

    expect(calls.some((call) => call[0] === 'fill')).to.equal(true);
    expect(calls).to.deep.include(['fillText', 'HAND', 50, 60]);
  });
});
