/*jshint expr:true */

const expect = require('chai').expect;
const transform = require('../../apps/client/src/player-card-canvas-transform');

describe('player-card-canvas-transform.js', () => {
  it('should scale an object around a center point', () => {
    const object = {
      left: 100,
      top: 120,
      scaleX: 1,
      scaleY: 1
    };

    transform.scaleObjectAroundPoint(object, 1.2, 160, 160);

    expect(object.scaleX).to.equal(1.2);
    expect(object.scaleY).to.equal(1.2);
    expect(object.left).to.equal(88);
    expect(object.top).to.equal(112);
  });

  it('should translate an object by a delta', () => {
    const object = {
      left: 100,
      top: 120
    };

    transform.translateObject(object, 15, -10);

    expect(object.left).to.equal(115);
    expect(object.top).to.equal(110);
  });

  it('should resolve arrow keys into pan deltas', () => {
    expect(transform.getKeyboardPanDelta('ArrowLeft', 12)).to.deep.equal({ x: -12, y: 0 });
    expect(transform.getKeyboardPanDelta('ArrowRight', 12)).to.deep.equal({ x: 12, y: 0 });
    expect(transform.getKeyboardPanDelta('ArrowUp', 12)).to.deep.equal({ x: 0, y: -12 });
    expect(transform.getKeyboardPanDelta('ArrowDown', 12)).to.deep.equal({ x: 0, y: 12 });
    expect(transform.getKeyboardPanDelta('Enter', 12)).to.equal(null);
  });
});
