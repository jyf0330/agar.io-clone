/*jshint expr:true */

const expect = require('chai').expect;
const formatRoundTimerStatus = require('../../apps/client/src/round-timer-status');

describe('round-timer-status.js', () => {
  it('should render remaining round time as a minute countdown', () => {
    const html = formatRoundTimerStatus({
      remainingMs: 599000,
      durationMs: 600000
    }, {
      t(key, values) {
        if (key === 'hud.roundTimer') {
          return '倒计时：' + values.time;
        }
        return key;
      }
    });

    expect(html).to.equal('<br /><span class="round-timer">倒计时：09:59</span>');
  });

  it('should omit the countdown when round timer data is missing', () => {
    expect(formatRoundTimerStatus(null, {t() { return ''; }})).to.equal('');
  });
});
