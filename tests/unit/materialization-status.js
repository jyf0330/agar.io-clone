/*jshint expr:true */

const expect = require('chai').expect;
const formatMaterializationStatus = require('../../apps/client/src/materialization-status');

describe('materialization-status.js', () => {
  it('should render materialization details without computing the stage on the client', () => {
    const markup = formatMaterializationStatus({
      materialization: 0,
      materializationStage: 'HOLLOW'
    });

    expect(markup).to.contain('Materialization: 0');
    expect(markup).to.contain('Stage: HOLLOW');
  });

  it('should hide the status block when player data is not ready', () => {
    expect(formatMaterializationStatus(null)).to.equal('');
  });
});
