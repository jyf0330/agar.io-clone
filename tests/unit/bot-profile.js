/*jshint expr:true */

const path = require('path');
const expect = require('chai').expect;
const {loadBotProfile, resolveProfilePath} = require('../../apps/bot-client/src/bot-profile');

describe('bot-profile.js', () => {
  it('should load a bot player profile with body choice data for gotit', () => {
    const profile = loadBotProfile(resolveProfilePath('doudou'));

    expect(profile.name).to.equal('Doudou_Bot');
    expect(profile.isBot).to.equal(true);
    expect(profile.bodySignature).to.include({
      slotType: 'FOOT',
      templateId: 'foot-default'
    });
    expect(profile.bodyAssembly.selectedParts.foot).to.equal('foot-default');
    expect(profile.playerCardPreviewDataUrl).to.match(/^data:image\/svg\+xml;base64,/);
  });

  it('should resolve profile names inside demo/bot-players', () => {
    const resolved = resolveProfilePath('mochi');

    expect(resolved).to.equal(path.resolve(process.cwd(), 'demo/bot-players/mochi.json'));
  });
});
