/*jshint expr:true */

const expect = require('chai').expect;
const render = require('../../apps/client/src/render');

describe('render ghost', () => {
  it('should draw a translucent historical echo with name and chat', () => {
    const calls = [];
    const graph = {
      save() { calls.push(['save']); },
      restore() { calls.push(['restore']); },
      beginPath() { calls.push(['beginPath']); },
      arc(x, y, radius) { calls.push(['arc', x, y, radius]); },
      closePath() { calls.push(['closePath']); },
      fill() { calls.push(['fill']); },
      stroke() { calls.push(['stroke']); },
      fillText(text, x, y) { calls.push(['fillText', text, x, y]); },
      strokeText(text, x, y) { calls.push(['strokeText', text, x, y]); }
    };

    render.drawGhost({ x: 40, y: 50 }, {
      radius: 34,
      name: 'Past Huy',
      chat: 'hello'
    }, graph);

    expect(calls).to.deep.include(['arc', 40, 50, 34]);
    expect(calls).to.deep.include(['fillText', 'Past Huy', 40, 50]);
    expect(calls).to.deep.include(['fillText', 'hello', 40, 12]);
  });
});
