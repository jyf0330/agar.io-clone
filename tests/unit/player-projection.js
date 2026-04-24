/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const playerUtils = require('../../apps/server/src/map/player');
const mapUtils = require('../../apps/server/src/map/map');
const {
  createSpectatorSyncData,
  projectPlayerForSync,
  projectPlayersForSync,
  projectVisibleWorldForSync
} = require('../../apps/server/src/player-projection');

describe('player-projection.js', () => {
  it('should project players into sync-safe DTOs', () => {
    const player = new playerUtils.Player('player-1');
    player.init({ x: 200, y: 200 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'tester',
      screenWidth: 800,
      screenHeight: 600,
      playerCardPreviewDataUrl: 'data:image/png;base64,card',
      bodySignature: {
        slotType: 'HAND',
        templateId: 'hand-open',
        tier: 'echo',
        similarity: 0.8
      }
    });
    player.admin = true;
    player.target = { x: 99, y: 42 };
    player.npcRelationships = [{npcId: 'mochi', relationshipValue: 7}];

    const projected = projectPlayerForSync(player);

    expect(projected.name).to.equal('tester');
    expect(projected.playerCardPreviewDataUrl).to.equal('data:image/png;base64,card');
    expect(projected.bodySignature).to.deep.equal({
      slotType: 'HAND',
      templateId: 'hand-open',
      tier: 'echo',
      similarity: 0.8
    });
    expect(projected.admin).to.equal(undefined);
    expect(projected.target).to.equal(undefined);
    expect(projected.npcRelationships[0].relationshipValue).to.equal(7);
    expect(projected.cells[0].toCircle).to.equal(undefined);
  });

  it('should project visible world state without coupling map visibility to DTO logic', () => {
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 250, y: 250 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'viewer',
      screenWidth: 800,
      screenHeight: 600
    });
    map.players.pushNew(player);
    map.partLoot.addPart({
      type: 'HAND',
      templateId: 'hand-thread'
    }, { x: 260, y: 260 });

    let projectedWorld;
    map.enumerateVisibleWorld((visibleWorld) => {
      projectedWorld = projectVisibleWorldForSync(visibleWorld);
    });

    const spectatorData = createSpectatorSyncData('spectator-1', config);

    expect(projectPlayersForSync(map.players.data)).to.deep.equal(projectedWorld.visiblePlayers);
    expect(projectedWorld.playerData.id).to.equal('player-1');
    expect(projectedWorld.visiblePartLoot[0].part.templateId).to.equal('hand-thread');
    expect(spectatorData.id).to.equal('spectator-1');
    expect(spectatorData.bodyPartCount).to.equal(0);
  });
});
