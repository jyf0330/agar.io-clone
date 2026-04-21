/*jshint expr:true */

const expect = require('chai').expect;
const i18n = require('../../apps/client/src/i18n');
const formatRelationshipStatus = require('../../apps/client/src/relationship-status');

describe('relationship-status.js', () => {
  beforeEach(() => {
    i18n.setLocale('en');
  });

  it('should render the three relationship attributes for the HUD', () => {
    const markup = formatRelationshipStatus({
      intimacy: 2,
      spike: 1,
      pollution: 3
    });

    expect(markup).to.contain('Resonance');
    expect(markup).to.contain('Intimacy: 2');
    expect(markup).to.contain('Spike: 1');
    expect(markup).to.contain('Pollution: 3');
  });

  it('should stay empty when relationship attributes are unavailable', () => {
    expect(formatRelationshipStatus(null)).to.equal('');
  });
});
