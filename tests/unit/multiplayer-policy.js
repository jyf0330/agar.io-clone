/*jshint expr:true */

const expect = require('chai').expect;
const playerUtils = require('../../apps/server/src/map/player');
const playerKind = require('../../apps/server/src/player-kind');
const multiplayerPolicy = require('../../apps/server/src/multiplayer-policy');

describe('multiplayer-policy.js', () => {
  it('should treat socket bots as competitive multiplayer players by default', () => {
    const human = new playerUtils.Player('human-1');
    const bot = new playerUtils.Player('bot-1');
    const npc = new playerUtils.Player('npc-1');

    playerKind.markBotPlayer(bot);
    playerKind.markNpcActor(npc);

    expect(multiplayerPolicy.isCompetitivePlayer(human)).to.equal(true);
    expect(multiplayerPolicy.isCompetitivePlayer(bot)).to.equal(true);
    expect(multiplayerPolicy.isCompetitivePlayer(npc)).to.equal(false);
    expect(multiplayerPolicy.canWinRound(bot)).to.equal(true);
  });

  it('should allow deployments to exclude bots from competitive outcomes', () => {
    const bot = new playerUtils.Player('bot-1');
    playerKind.markBotPlayer(bot);

    const policy = multiplayerPolicy.createMultiplayerPolicy({
      botPlayers: {
        competitive: false
      }
    });

    expect(policy.isCompetitivePlayer(bot)).to.equal(false);
    expect(policy.canWinRound(bot)).to.equal(false);
  });
});
