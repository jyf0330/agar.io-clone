/*jshint expr:true */

const expect = require('chai').expect;
const parts = require('../../apps/client/src/data/body-assembly-parts');

describe('body assembly config', () => {
  it('should build a seven-layer body object with the selected option replacing the missing fixed part', () => {
    const bodyConfig = parts.createBodyAssemblyConfig({
      missingPartType: 'leg_left',
      selectedOption: parts.OPTION_PARTS.leg_left[1]
    });

    expect(Object.keys(bodyConfig.layers)).to.deep.equal([
      'base',
      'head',
      'body',
      'hand_left',
      'hand_right',
      'leg_left',
      'leg_right'
    ]);
    expect(bodyConfig.layers.base.image).to.equal('img/body-assembly/base/body_base_01.png');
    expect(bodyConfig.layers.head.id).to.equal('head_fixed_01');
    expect(bodyConfig.layers.leg_left.id).to.equal('leg_left_option_02');
    expect(bodyConfig.layers.leg_right.id).to.equal('leg_right_fixed_01');
    expect(bodyConfig.anchors.head).to.deep.equal({ x: 512, y: 210, zIndex: 30 });
  });
});
