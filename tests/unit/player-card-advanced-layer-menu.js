/*jshint expr:true */

const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');

describe('player card advanced layer menu', () => {
  it('should render advanced layer controls behind a collapsed submenu', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../apps/client/index.html'), 'utf8');

    expect(html).to.include('id="toggleAdvancedLayersButton"');
    expect(html).to.match(/id="playerCardLayerPanel" class="player-card-layer-panel hidden"/);
  });
});
