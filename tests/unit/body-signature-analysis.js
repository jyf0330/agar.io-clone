/*jshint expr:true */

const expect = require('chai').expect;
const analysis = require('../../apps/client/src/body-signature-analysis');
const config = require('../../apps/client/src/body-signature-config');

describe('body-signature-analysis.js', () => {
  it('should classify similarity into the V5 hash tiers', () => {
    expect(analysis.getTier(0.05, config.tiers)).to.equal('none');
    expect(analysis.getTier(0.25, config.tiers)).to.equal('faint');
    expect(analysis.getTier(0.75, config.tiers)).to.equal('echo');
  });

  it('should score identical reference grids as a full match', () => {
    const grid = analysis.createReferenceGrid('hand-open');

    expect(analysis.compareGrids(grid, grid)).to.equal(1);
    expect(analysis.gridCoverage(grid)).to.be.greaterThan(0.05);
  });
});
