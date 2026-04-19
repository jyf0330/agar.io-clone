/*jshint expr:true */

const expect = require('chai').expect;
const scale = require('../../apps/client/src/player-card-scale');

describe('player-card-scale.js', () => {
  it('should scale up by the fixed multiplier', () => {
    expect(scale.getNextScale(1, 'in')).to.equal(1.2);
  });

  it('should scale down by the fixed divisor', () => {
    expect(scale.getNextScale(1.2, 'out')).to.equal(1);
  });

  it('should clamp scale at the configured maximum', () => {
    expect(scale.getNextScale(4.9, 'in')).to.equal(scale.MAX_SCALE);
    expect(scale.canScaleIn(scale.MAX_SCALE)).to.equal(false);
  });

  it('should clamp scale at the configured minimum', () => {
    expect(scale.getNextScale(0.2, 'out')).to.equal(scale.MIN_SCALE);
    expect(scale.canScaleOut(scale.MIN_SCALE)).to.equal(false);
  });
});
