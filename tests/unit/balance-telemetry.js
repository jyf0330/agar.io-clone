/*jshint expr:true */

const expect = require('chai').expect;
const balanceTelemetry = require('../../apps/server/src/balance/telemetry');

describe('balance telemetry', () => {
  it('should collect compact world snapshots for balance audits', () => {
    const sink = [];
    const telemetry = balanceTelemetry.createBalanceTelemetry({
      enabled: true,
      sink,
      now() {
        return 1234;
      }
    });

    telemetry.recordWorldSnapshot({
      balancePreset: 'standard',
      roundTimer: {elapsedMs: 60000, remainingMs: 660000},
      map: {
        food: {data: [{}, {}]},
        viruses: {data: [{}]},
        massFood: {data: [{mass: 20}]},
        partLoot: {data: [{part: {partType: 'HAND'}}]},
        ghosts: [{}, {}],
        players: {
          data: [
            {id: 'p1', massTotal: 42, bodyPartCount: 7, bodyPartCounts: {HAND: 3}},
            {id: 'npc-1', isNpc: true, massTotal: 10}
          ]
        }
      }
    });

    expect(sink).to.have.length(1);
    expect(sink[0]).to.include({
      eventType: 'balance_world_snapshot',
      ts: 1234,
      balancePreset: 'standard',
      elapsedMs: 60000,
      playerCount: 1,
      foodCount: 2,
      virusCount: 1,
      massFoodCount: 1,
      partLootCount: 1,
      ghostCount: 2
    });
    expect(sink[0].players[0]).to.include({
      id: 'p1',
      massTotal: 42,
      bodyPartCount: 7
    });
  });

  it('should record body part pickups with source and part type', () => {
    const sink = [];
    const telemetry = balanceTelemetry.createBalanceTelemetry({
      enabled: true,
      sink,
      now() {
        return 2000;
      }
    });

    telemetry.recordPartPickup({
      balancePreset: 'demo',
      player: {id: 'p1', massTotal: 25, bodyPartCount: 8},
      pickup: {
        loot: {source: 'ghost-echo'},
        equippedPart: {partType: 'HEAD', sourceType: 'ghost_echo'}
      }
    });

    expect(sink).to.have.length(1);
    expect(sink[0]).to.include({
      eventType: 'balance_part_pickup',
      ts: 2000,
      balancePreset: 'demo',
      playerId: 'p1',
      partType: 'HEAD',
      sourceType: 'ghost_echo',
      lootSource: 'ghost-echo'
    });
  });

  it('should stay silent when disabled', () => {
    const sink = [];
    const telemetry = balanceTelemetry.createBalanceTelemetry({enabled: false, sink});

    telemetry.recordWorldSnapshot({map: {}});
    telemetry.recordPartPickup({});

    expect(sink).to.have.length(0);
  });
});
