/*jshint expr:true */

const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');

describe('client index html', () => {
  it('should expose the draft manager id required by the player card draft flow', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../apps/client/index.html'), 'utf8');

    expect(html).to.include('id="playerCardDraftManager"');
  });

  it('should expose the V5 body signature drawing panel ids', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../apps/client/index.html'), 'utf8');

    expect(html).to.include('id="bodySignaturePanel"');
    expect(html).to.include('id="bodySignatureCanvas"');
    expect(html).to.include('id="bodySignatureSubmitButton"');
  });

  it('should declare a favicon to avoid browser 404 noise', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../../apps/client/index.html'), 'utf8');

    expect(html).to.include('rel="icon"');
    expect(html).to.include('href="img/feed.png"');
  });
});
