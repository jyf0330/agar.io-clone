/*jshint expr:true */

const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');

describe('player card lock controls styles', () => {
  it('should hide lock buttons in the player card editor', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../apps/client/assets/css/main.css'), 'utf8');

    expect(css).to.include('#layerBaseLockButton');
    expect(css).to.include('#layerEyesLockButton');
    expect(css).to.include('#layerHairLockButton');
    expect(css).to.match(/#layerBaseLockButton[\s\S]*display:\s*none;/);
    expect(css).to.match(/#layerEyesLockButton[\s\S]*display:\s*none;/);
    expect(css).to.match(/#layerHairLockButton[\s\S]*display:\s*none;/);
  });
});
