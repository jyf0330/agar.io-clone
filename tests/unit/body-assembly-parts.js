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

  it('should expose map loot templates using the same option images as the selection UI', () => {
    const templates = parts.createPartLootTemplates();
    const headLoot = templates.find((template) => template.templateId === 'head_option_02');
    const bodyLoot = templates.find((template) => template.templateId === 'body_option_01');
    const leftHandLoot = templates.find((template) => template.templateId === 'hand_left_option_03');
    const rightLegLoot = templates.find((template) => template.templateId === 'leg_right_option_02');

    expect(templates).to.have.length(18);
    expect(headLoot).to.deep.include({
      type: 'HEAD',
      assemblyPartType: 'head',
      displayName: '木偶头',
      image: 'img/body-assembly/options/head/head_option_02.png'
    });
    expect(bodyLoot).to.deep.include({
      type: 'HEART',
      assemblyPartType: 'body',
      image: 'img/body-assembly/options/body/body_option_01.png'
    });
    expect(leftHandLoot).to.deep.include({
      type: 'HAND',
      assemblyPartType: 'hand_left',
      image: 'img/body-assembly/options/hand_left/hand_left_option_03.png'
    });
    expect(rightLegLoot).to.deep.include({
      type: 'FOOT',
      assemblyPartType: 'leg_right',
      image: 'img/body-assembly/options/leg_right/leg_right_option_02.png'
    });
  });

  it('should replace a complete body assembly layer with a picked loot part', () => {
    const bodyAssembly = parts.createBodyAssemblyConfig({
      missingPartType: 'head',
      selectedOption: parts.OPTION_PARTS.head[0]
    });
    const updated = parts.applyPartToBodyAssembly(bodyAssembly, {
      partType: 'HEAD',
      templateId: 'head_option_03',
      assemblyPartType: 'head',
      displayName: '灯笼头',
      image: 'img/body-assembly/options/head/head_option_03.png'
    });

    expect(updated.layers.head.id).to.equal('head_option_03');
    expect(updated.layers.head.name).to.equal('灯笼头');
    expect(updated.layers.head.image).to.equal('img/body-assembly/options/head/head_option_03.png');
    expect(updated.selectedParts.head).to.equal('head_option_03');
    expect(bodyAssembly.layers.head.id).to.equal('head_option_01');
  });
});
