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
      acquired: 'ghost echo pickup',
      removed: false
    });
    expect(summary.bodyParts[0].stats).to.deep.equal(['pickupRange +10']);
    expect(summary.historyWritten).to.equal(true);
    expect(summary.keyEvents).to.have.length(1);
    expect(summary.keyEvents[0]).to.include({
      eventType: 'picked',
      partId: 'hand-1',
      partType: 'HAND',
      displayName: 'Thread Hand',
      sourceType: 'ghost_echo',
      x: 120,
      y: 130
    });
    expect(summary.petClosingLine).to.contain('Thread Hand');
  });

  it('should label npc reward parts as task rewards in the body source list', () => {
    const part = body.appendPartHistory(body.createBodyPart('HAND', 1, {
      partId: 'task-hand-1',
      displayName: 'Task Hand',
      sourceType: 'npc_reward',
      originPlayerId: 'npc-mochi',
      originPlayerName: 'Mochi'
    }), 'picked', {
      playerId: 'player-a',
      x: 200,
      y: 210,
      sourceType: 'npc_reward'
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

    expect(summary.bodyParts[0]).to.include({
      sourceType: 'npc_reward',
      acquired: 'npc task reward',
      originPlayerName: 'Mochi'
    });
    expect(summary.keyEvents[0]).to.include({
      eventType: 'picked',
      sourceType: 'npc_reward'
    });
  });

  it('should only recognize explicit demo settlement requests', () => {
    expect(settlement.isDemoSettlementRequest('demo settle')).to.equal(true);
    expect(settlement.isDemoSettlementRequest('demo结算')).to.equal(true);
    expect(settlement.isDemoSettlementRequest('快速结算')).to.equal(true);
    expect(settlement.isDemoSettlementRequest('结算一下')).to.equal(false);
  });
});
