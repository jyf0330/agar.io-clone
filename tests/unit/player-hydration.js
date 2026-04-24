/*jshint expr:true */

const expect = require('chai').expect;
const hydratePlayerState = require('../../apps/client/src/player-hydration');

describe('player-hydration.js', () => {
  it('should copy server sync fields onto the local player object', () => {
    const player = {
      localOnlyFlag: true
    };
    const playerData = {
      x: 10,
      y: 20,
      hue: 30,
      massTotal: 40,
      materialization: 50,
      materializationStage: 'REAL',
      connectionStatus: 'CHANNELING',
      connectionTargetId: 'target-1',
      connectionTargetName: 'target',
      intimacy: 2,
      spike: 1,
      pollution: 3,
      bodyParts: [{ type: 'HEAD' }],
      bodyPartCount: 1,
      bodyPartCounts: { HEAD: 1 },
      npcRelationships: [{npcId: 'mochi', relationshipValue: 7}],
      playerCardPreviewDataUrl: 'data:image/png;base64,card',
      ghostDebug: {enabled: true, activeGhostCount: 1},
      cells: [{ x: 1, y: 2, mass: 3, radius: 4 }]
    };

    hydratePlayerState(player, playerData);

    expect(player.localOnlyFlag).to.equal(true);
    expect(player.x).to.equal(10);
    expect(player.connectionTargetId).to.equal('target-1');
    expect(player.bodyPartCounts.HEAD).to.equal(1);
    expect(player.npcRelationships[0].relationshipValue).to.equal(7);
    expect(player.ghostDebug.activeGhostCount).to.equal(1);
    expect(player.cells[0].mass).to.equal(3);
  });
});
