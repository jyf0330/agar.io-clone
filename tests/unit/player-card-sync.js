/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const playerUtils = require('../../apps/server/src/map/player');
const mapUtils = require('../../apps/server/src/map/map');
const {projectVisibleWorldForSync} = require('../../apps/server/src/player-projection');

describe('player-card-sync.js', () => {
  it('should expose saved player card previews in player sync payloads', () => {
    const map = new mapUtils.Map(config);
    const player = new playerUtils.Player('player-1');
    player.init({ x: 200, y: 200 }, config.defaultPlayerMass);
    player.clientProvidedData({
      name: 'artist',
      screenWidth: 800,
      screenHeight: 600,
      playerCardPreviewDataUrl: 'data:image/png;base64,card'
    });
    map.players.pushNew(player);

    let result;
    map.enumerateVisibleWorld((visibleWorld) => {
      result = projectVisibleWorldForSync(visibleWorld);
    });

    expect(result.playerData.playerCardPreviewDataUrl).to.equal('data:image/png;base64,card');
    expect(result.visiblePlayers[0].playerCardPreviewDataUrl).to.equal('data:image/png;base64,card');
  });
});
