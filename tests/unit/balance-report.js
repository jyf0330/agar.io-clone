/*jshint expr:true */

const expect = require('chai').expect;
const report = require('../../apps/server/src/balance/report');

describe('balance report', () => {
  it('should summarize rhythm metrics by balance preset', () => {
    const events = [
      {
        eventType: 'balance_world_snapshot',
        balancePreset: 'demo',
        elapsedMs: 0,
        foodCount: 1000,
        ghostCount: 0,
        playerCount: 2,
        players: [{id: 'p1', massTotal: 10}]
      },
      {
        eventType: 'balance_world_snapshot',
        balancePreset: 'demo',
        elapsedMs: 30000,
        foodCount: 960,
        ghostCount: 1,
        playerCount: 2,
        players: [{id: 'p1', massTotal: 24}]
      },
      {
        eventType: 'balance_part_pickup',
        balancePreset: 'demo',
        playerId: 'p1',
        partType: 'HAND',
        sourceType: 'map_pickup',
        lootSource: 'map-pickup',
        ts: 1000
      },
      {
        eventType: 'balance_player_devour',
        balancePreset: 'demo',
        eaterId: 'p1',
        victimId: 'p2',
        stolenPartType: 'HEAD'
      },
      {
        eventType: 'balance_round_settlement',
        balancePreset: 'demo',
        endedReason: 'body_complete',
        activeHumanCount: 2
      }
    ];

    const summary = report.summarizeEvents(events);

    expect(summary.presets).to.have.length(1);
    expect(summary.presets[0]).to.include({
      preset: 'demo',
      snapshots: 2,
      firstGhostMs: 30000,
      firstPartPickupMs: 30000,
      devourCount: 1,
      settlementCount: 1,
      bodyCompletionRate: 1
    });
    expect(summary.presets[0].partsBySource.map_pickup).to.equal(1);
    expect(summary.presets[0].maxPlayerMass).to.equal(24);
  });

  it('should evaluate demo and standard targets with pass flags', () => {
    const summary = report.summarizeEvents([
      {eventType: 'balance_world_snapshot', balancePreset: 'standard', elapsedMs: 120000, ghostCount: 1, players: [{massTotal: 18}]},
      {eventType: 'balance_part_pickup', balancePreset: 'standard', sourceType: 'ghost_echo'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'body_complete'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'body_complete'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'round_end'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'round_end'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'round_end'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'round_end'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'round_end'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'round_end'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'round_end'},
      {eventType: 'balance_round_settlement', balancePreset: 'standard', endedReason: 'round_end'}
    ]);

    const standard = summary.presets[0];

    expect(standard.targets.firstPartPickup.pass).to.equal(true);
    expect(standard.targets.firstGhost.pass).to.equal(true);
    expect(standard.targets.bodyCompletionRate.pass).to.equal(true);
  });
});
