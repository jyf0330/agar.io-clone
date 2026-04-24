/*jshint expr:true */

const expect = require('chai').expect;
const body = require('../../apps/server/src/body');
const settlement = require('../../apps/server/src/settlement');

describe('settlement summary', () => {
  it('should summarize body part source and history without inventing events', () => {
    const part = body.appendPartHistory(body.createBodyPart('HAND', 1, {
      partId: 'hand-1',
      displayName: 'Thread Hand',
      stats: {pickupRange: 10},
      sourceType: 'ghost_echo',
      originPlayerId: 'player-old',
      originPlayerName: 'Old Player'
    }), 'picked', {
      playerId: 'player-a',
      x: 120,
      y: 130
    });
    const summary = settlement.buildSettlementSummary({
      player: {
        id: 'player-a',
        name: 'Alice',
        bodyParts: [part]
      },
      endedReason: 'round_end',
      historyWritten: true
    });

    expect(summary.bodyParts).to.have.length(1);
    expect(summary.bodyParts[0]).to.include({
      partId: 'hand-1',
      partType: 'HAND',
      displayName: 'Thread Hand',
      sourceType: 'ghost_echo',
      originPlayerId: 'player-old',
      originPlayerName: 'Old Player',
      acquired: 'picked from map',
      removed: false
    });
    expect(summary.bodyParts[0].stats).to.deep.equal(['pickupRange +10']);
    expect(summary.historyWritten).to.equal(true);
  });
});
