/*jshint expr:true */

const expect = require('chai').expect;
const playerUtils = require('../../apps/server/src/map/player');
const playerKind = require('../../apps/server/src/player-kind');

describe('player-kind.js', () => {
  it('should distinguish human players, socket bots, and npc actors', () => {
    const human = new playerUtils.Player('human-1');
    const bot = new playerUtils.Player('bot-1');
    const npc = new playerUtils.Player('npc-1');

    playerKind.markBotPlayer(bot);
    playerKind.markNpcActor(npc);

    expect(playerKind.getPlayerKind(human)).to.equal('human');
    expect(playerKind.getPlayerKind(bot)).to.equal('bot');
    expect(playerKind.getPlayerKind(npc)).to.equal('npc');
    expect(playerKind.isCompetitivePlayer(human)).to.equal(true);
    expect(playerKind.isCompetitivePlayer(bot)).to.equal(true);
    expect(playerKind.isCompetitivePlayer(npc)).to.equal(false);
    expect(bot.isBot).to.equal(true);
    expect(bot.isNpc).to.equal(false);
    expect(npc.isNpc).to.equal(true);
  });
});
