/*jshint expr:true */

const path = require('path');
const expect = require('chai').expect;
const bodyAssemblyParts = require('../../apps/client/src/data/body-assembly-parts');
const {
  createCompleteBodyAssembly,
  loadBotProfile,
  resolveProfilePath
} = require('../../apps/bot-client/src/bot-profile');

describe('bot-profile.js', () => {
  it('should load a bot player profile with body choice data for gotit', () => {
    const profile = loadBotProfile(resolveProfilePath('doudou'));

    expect(profile.name).to.equal('Doudou_Bot');
    expect(profile.isBot).to.equal(true);
    expect(profile.bodySignature).to.include({
      slotType: 'FOOT',
      templateId: 'foot-default'
    });
    expect(Object.keys(profile.bodyAssembly.selectedParts)).to.deep.equal(bodyAssemblyParts.PART_TYPES);
    expect(bodyAssemblyParts.PART_TYPES.every((partType) => profile.bodyAssembly.layers[partType])).to.equal(true);
    expect(profile.bodyAssembly.selectedParts.leg_left).to.equal('leg_left_option_01');
    expect(profile.bodyAssembly.selectedParts.leg_right).to.equal('leg_right_option_01');
    expect(profile.playerCardPreviewDataUrl).to.match(/^data:image\/svg\+xml;base64,/);
    expect(profile.strategy.humanize).to.equal(true);
    expect(profile.strategy.persona).to.equal('greedy-roamer');
  });

  it('should expand legacy bot body choices into the six visible assembly slots', () => {
    const bodyAssembly = createCompleteBodyAssembly({
      selectedParts: {
        hand: 'hand_left_option_01',
        foot: 'leg_right_option_02'
      }
    });

    expect(Object.keys(bodyAssembly.selectedParts)).to.deep.equal(bodyAssemblyParts.PART_TYPES);
    expect(bodyAssembly.layers.head.id).to.equal('head_fixed_01');
    expect(bodyAssembly.layers.body.id).to.equal('body_fixed_01');
    expect(bodyAssembly.layers.hand_left.id).to.equal('hand_left_option_01');
    expect(bodyAssembly.layers.hand_right.id).to.equal('hand_right_fixed_01');
    expect(bodyAssembly.layers.leg_left.id).to.equal('leg_left_fixed_01');
    expect(bodyAssembly.layers.leg_right.id).to.equal('leg_right_option_02');
  });

  it('should resolve profile names inside demo/bot-players', () => {
    const resolved = resolveProfilePath('mochi');

    expect(resolved).to.equal(path.resolve(process.cwd(), 'demo/bot-players/mochi.json'));
  });
});
