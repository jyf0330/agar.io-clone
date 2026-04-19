/*jshint expr:true */

const expect = require('chai').expect;
const formatConnectionStatus = require('../../apps/client/src/connection-status');

describe('connection-status.js', () => {
  it('should render connection status details for the HUD', () => {
    const markup = formatConnectionStatus({
      connectionStatus: 'CHANNELING',
      connectionTargetName: 'targetA'
    });

    expect(markup).to.contain('连接');
    expect(markup).to.contain('状态：CHANNELING');
    expect(markup).to.contain('目标：targetA');
  });

  it('should stay empty when the player has no connection state', () => {
    expect(formatConnectionStatus(null)).to.equal('');
  });
});
