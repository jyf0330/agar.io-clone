/*jshint expr:true */

const expect = require('chai').expect;
const formatBodyStatus = require('../../apps/client/src/body-status');

describe('body-status.js', () => {
  it('should render body part totals for the HUD', () => {
    const markup = formatBodyStatus({
      bodyPartCount: 6,
      bodyPartCounts: {
        HEAD: 1,
        HAND: 2,
        FOOT: 1,
        MOUTH: 1,
        HEART: 1,
        SPIKE: 0
      }
    });

    expect(markup).to.contain('Body');
    expect(markup).to.contain('Parts: 6');
    expect(markup).to.contain('Hand: 2');
  });

  it('should stay empty when body part data is unavailable', () => {
    expect(formatBodyStatus(null)).to.equal('');
  });
});
