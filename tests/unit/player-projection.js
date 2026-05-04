/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const playerUtils = require('../../apps/server/src/map/player');
const mapUtils = require('../../apps/server/src/map/map');
const playerKind = require('../../apps/server/src/player-kind');
const {
  createSpectatorSyncData,
  projectPlayerMetaForSync,
  projectPlayerMovementForSync,
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
      bodyAssembly: {
        missingPartType: 'leg_left',
        layers: {
          leg_left: {id: 'leg_left_option_02', image: 'img/body-assembly/options/leg_left/leg_left_option_02.png'}
        }
      },
      bodySignature: {
        slotType: 'HAND',
        templateId: 'hand-open',
        tier: 'echo',
        similarity: 0.8
      }
    });
    player.admin = true;
    player.target = { x: 99, y: 42 };
    player.invincibleUntil = 1700000003000;
    player.npcRelationships = [{npcId: 'mochi', relationshipValue: 7}];

    const originalNow = Date.now;
    let projected;
    try {
      Date.now = () => 1700000000000;
      projected = projectPlayerForSync(player);
    } finally {
      Date.now = originalNow;
    }

    expect(projected.name).to.equal('tester');
    expect(projected.invincibleUntil).to.equal(1700000003000);
    expect(projected.isInvincible).to.equal(true);
    expect(projected.playerCardPreviewDataUrl).to.equal('data:image/png;base64,card');
    expect(projected.bodyAssembly.layers.leg_left.id).to.equal('leg_left_option_02');
    expect(projected.bodySignature).to.deep.equal({
      slotType: 'HAND',
      templateId: 'hand-open',
      tier: 'echo',
      similarity: 0.8
    });
    expect(projected.admin).to.equal(undefined);
    expect(projected.target).to.equal(undefined);
    expect(projected.playerKind).to.equal('human');
    expect(projected.isBot).to.equal(false);
    expect(projected.isNpc).to.equal(false);
    expect(projected.activePet).to.equal(null);
    expect(projected.npcRelationships[0].relationshipValue).to.equal(7);
    expect(projected.cells[0].toCircle).to.equal(undefined);
  });

  it('should project a switched active pet with a player pet memory key', () => {
    const player = new playerUtils.Player('player-1');
    player.init({ x: 200, y: 200 }, config.defaultPlayerMass);
    player.setActivePet({
      petId: 'doudou',
      npcId: 'doudou',
      name: 'Doudou',
      personality: '调皮捣蛋'
    });

    const projected = projectPlayerForSync(player);

    expect(projected.activePet).to.include({
      petId: 'doudou',
      npcId: 'doudou',
      name: 'Doudou',
      ownerPlayerId: 'player-1',
      active: true
    });
    expect(projected.activePet.memoryKey).to.equal('player-1:doudou');
  });

  it('should keep high-frequency movement payloads free of cold player metadata', () => {
    const player = new playerUtils.Player('player-1');
    player.init({ x: 200, y: 200 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'artist',
      screenWidth: 800,
      screenHeight: 600,
      playerCardPreviewDataUrl: 'data:image/png;base64,card',
      bodySignature: {
        slotType: 'HAND',
        tier: 'echo'
      }
    });
    player.invincibleUntil = 1700000003000;
    player.npcRelationships = [{npcId: 'mochi', relationshipValue: 7}];
    player.setActivePet({
      petId: 'mochi',
      npcId: 'mochi',
      name: 'Mochi',
      x: 146,
      y: 242,
      radius: 18
    });

    const originalNow = Date.now;
    let movement;
    let meta;
    try {
      Date.now = () => 1700000000000;
      movement = projectPlayerMovementForSync(player);
      meta = projectPlayerMetaForSync(player);
    } finally {
      Date.now = originalNow;
    }

    expect(movement).to.include({
      id: 'player-1',
      name: 'artist',
      x: 200,
      y: 200,
      invincibleUntil: 1700000003000,
      isInvincible: true
    });
    expect(movement.cells[0]).to.include({x: 200, y: 200});
    expect(movement.playerCardPreviewDataUrl).to.equal(undefined);
    expect(movement.bodyAssembly).to.equal(undefined);
    expect(movement.bodyParts).to.equal(undefined);
    expect(movement.equipmentSlots).to.equal(undefined);
    expect(movement.npcRelationships).to.equal(undefined);
    expect(movement.bodySignature).to.equal(undefined);
    expect(movement.activePet).to.include({
      x: 146,
      y: 242,
      radius: 18
    });

    expect(meta).to.include({
      id: 'player-1',
      name: 'artist',
      invincibleUntil: 1700000003000,
      isInvincible: true,
      playerCardPreviewDataUrl: 'data:image/png;base64,card'
    });
    expect(meta.activePet).to.include({
      petId: 'mochi',
      npcId: 'mochi',
      name: 'Mochi'
    });
    expect(meta.activePet.x).to.equal(undefined);
    expect(meta.activePet.y).to.equal(undefined);
    expect(meta.bodyParts).to.be.an('array').that.is.not.empty;
    expect(meta.equipmentSlots.rightHand.partType).to.equal('HAND');
    expect(meta.npcRelationships[0].relationshipValue).to.equal(7);
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
    map.ghosts.push({
      id: 'old-session:old-player',
      name: 'Past Huy',
      x: 255,
      y: 255,
      radius: 34,
      chat: 'hello'
    });

    let projectedWorld;
    map.enumerateVisibleWorld((visibleWorld) => {
      projectedWorld = projectVisibleWorldForSync(visibleWorld);
    });

    const spectatorData = createSpectatorSyncData('spectator-1', config);

    expect(projectPlayersForSync(map.players.data)).to.deep.equal(projectedWorld.visiblePlayers);
    expect(projectedWorld.playerData.id).to.equal('player-1');
    expect(projectedWorld.visiblePartLoot[0].part.templateId).to.equal('hand-thread');
    expect(projectedWorld.visibleGhosts[0].name).to.equal('Past Huy');
    expect(spectatorData.id).to.equal('spectator-1');
    expect(spectatorData.bodyPartCount).to.equal(0);
    expect(spectatorData.isInvincible).to.equal(false);
  });

  it('should project bot identity into client DTOs', () => {
    const player = new playerUtils.Player('bot-1');
    player.init({ x: 200, y: 200 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'Bot_01',
      screenWidth: 800,
      screenHeight: 600
    });
    playerKind.markBotPlayer(player);

    const full = projectPlayerForSync(player);
    const movement = projectPlayerMovementForSync(player);
    const meta = projectPlayerMetaForSync(player);

    [full, movement, meta].forEach((projected) => {
      expect(projected).to.include({
        id: 'bot-1',
        name: 'Bot_01',
        playerKind: 'bot',
        isBot: true,
        isNpc: false
      });
    });
  });
});
