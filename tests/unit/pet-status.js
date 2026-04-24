/*jshint expr:true */

const expect = require('chai').expect;
const formatPetStatus = require('../../apps/client/src/pet-status');

describe('pet-status.js', () => {
  it('should stay hidden when there is no active pet', () => {
    expect(formatPetStatus({})).to.equal('');
    expect(formatPetStatus({activePet: {active: false}})).to.equal('');
  });

  it('should render the current active pet name and personality', () => {
    const status = formatPetStatus({
      activePet: {
        active: true,
        petId: 'mochi',
        name: '麻薯',
        personality: '谨慎型'
      }
    });

    expect(status).to.contain('跟宠：麻薯');
    expect(status).to.contain('谨慎型');
  });
});
