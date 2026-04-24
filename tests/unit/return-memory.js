/*jshint expr:true */

const expect = require('chai').expect;
const returnMemory = require('../../apps/server/src/npc/return-memory');

describe('return-memory.js', () => {
  it('should stay silent when a summary has no L1 evidence', () => {
    expect(returnMemory.buildReturnMemoryLine({
      summary: '玩家说自己来过。'
    })).to.equal(null);
  });

  it('should build a short return line from an evidenced L2 summary', () => {
    const line = returnMemory.buildReturnMemoryLine({
      summary: '玩家跟着回声捡到一只手。',
      referencedL1EventIds: ['l1-a']
    });

    expect(line).to.contain('你又来了');
    expect(line).to.contain('玩家跟着回声');
    expect(line.length).to.be.at.most(28);
  });
});
