/*jshint expr:true */

const expect = require('chai').expect;

const parts = require('../../apps/client/src/data/body-assembly-parts');

describe('body-assembly-parts.js', () => {
  it('should define the six supported assembly part types', () => {
    expect(parts.PART_TYPES).to.deep.equal([
      'head',
      'body',
      'hand_left',
      'hand_right',
      'leg_left',
      'leg_right'
    ]);
  });

  it('should provide fixed images and three options for each part type', () => {
    parts.PART_TYPES.forEach((partType) => {
      expect(parts.FIXED_PARTS[partType]).to.include({
        id: partType + '_fixed_01'
      });
      expect(parts.FIXED_PARTS[partType].image).to.equal('img/body-assembly/fixed/' + partType + '_fixed_01.png');

      expect(parts.OPTION_PARTS[partType]).to.have.length(3);
      parts.OPTION_PARTS[partType].forEach((option, index) => {
        const number = String(index + 1).padStart(2, '0');
        expect(option.id).to.equal(partType + '_option_' + number);
        expect(option.image).to.equal('img/body-assembly/options/' + partType + '/' + partType + '_option_' + number + '.png');
        expect(option.stats).to.be.an('object');
      });
    });
  });

  it('should expose 1024 preview anchors with stable z-index ordering', () => {
    expect(parts.PART_ANCHORS).to.deep.equal({
      head: { x: 512, y: 210, zIndex: 30 },
      body: { x: 512, y: 430, zIndex: 10 },
      hand_left: { x: 330, y: 430, zIndex: 20 },
      hand_right: { x: 690, y: 430, zIndex: 20 },
      leg_left: { x: 430, y: 670, zIndex: 5 },
      leg_right: { x: 590, y: 670, zIndex: 5 }
    });
  });
});
