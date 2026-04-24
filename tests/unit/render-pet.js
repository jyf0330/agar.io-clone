/*jshint expr:true */

const expect = require('chai').expect;
const render = require('../../apps/client/src/render');

describe('render pet', () => {
  it('should draw a compact active pet marker', () => {
    const calls = [];
    const graph = {
      save() { calls.push(['save']); },
      restore() { calls.push(['restore']); },
      beginPath() { calls.push(['beginPath']); },
      arc(x, y, radius) { calls.push(['arc', x, y, radius]); },
      closePath() { calls.push(['closePath']); },
      fill() { calls.push(['fill']); },
      stroke() { calls.push(['stroke']); },
      fillText(text, x, y) { calls.push(['fillText', text, x, y]); }
    };

    render.drawPet({ x: 40, y: 50 }, {
      radius: 18,
      name: 'Mochi'
    }, graph);

    expect(calls).to.deep.include(['arc', 40, 50, 18]);
    expect(calls).to.deep.include(['fillText', 'Mochi', 40, 24]);
  });
});
