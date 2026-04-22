/*jshint expr:true */

const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');

describe('client index html', () => {
  it('should expose the draft manager id required by the player card draft flow', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../apps/client/index.html'), 'utf8');

    expect(html).to.include('id="playerCardDraftManager"');
  });
});
