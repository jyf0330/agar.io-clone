/*jshint expr:true */

const expect = require('chai').expect;
const formatGhostDebugStatus = require('../../apps/client/src/ghost-debug-status');

describe('ghost-debug-status.js', () => {
  it('should stay hidden unless ghost debug is enabled', () => {
    expect(formatGhostDebugStatus({})).to.equal('');
    expect(formatGhostDebugStatus({ghostDebug: {enabled: false}})).to.equal('');
  });

  it('should render a compact historical echo debug summary', () => {
    const status = formatGhostDebugStatus({
      ghostDebug: {
        enabled: true,
        activeGhostCount: 2,
        maxActiveGhosts: 3,
        timeWindowMs: 30000,
        triggerRadius: 800,
        anchors: [
          {inTimeWindow: true},
          {inTimeWindow: false}
        ]
      }
    });

    expect(status).to.contain('历史回响调试');
    expect(status).to.contain('active 2/3');
    expect(status).to.contain('anchors 2');
    expect(status).to.contain('ready 1');
  });
});
