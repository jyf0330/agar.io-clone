/*jshint expr:true */

const expect = require('chai').expect;
const formatMaterializationStatus = require('../../apps/client/src/materialization-status');

describe('materialization-status.js', () => {
  it('should render materialization details without computing the stage on the client', () => {
    const markup = formatMaterializationStatus({
      materialization: 0,
      materializationStage: 'HOLLOW'
    });

    expect(markup).to.contain('实体化值：0');
    expect(markup).to.contain('阶段：HOLLOW');
  });

  it('should hide the status block when player data is not ready', () => {
    expect(formatMaterializationStatus(null)).to.equal('');
  });
});
