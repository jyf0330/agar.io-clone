/*jshint expr:true */

const expect = require('chai').expect;
const playerUtils = require('../../apps/server/src/map/player');
const playerKind = require('../../apps/server/src/player-kind');

describe('player manager', () => {
  it('should keep npc pets out of pvp leaderboard and mass balance totals', () => {
    const players = new playerUtils.PlayerManager();
    const alice = new playerUtils.Player('alice');
    const pet = new playerUtils.Player('npc-mochi');

    alice.init({ x: 100, y: 100 }, 20);
    alice.name = 'Alice';
    pet.init({ x: 120, y: 120 }, 200);
    pet.name = 'Mochi';
    pet.isNpc = true;

    players.pushNew(alice);
    players.pushNew(pet);

    expect(players.getTopPlayers()).to.deep.equal([{id: 'alice', name: 'Alice'}]);
    expect(players.getTotalMass()).to.equal(20);
  });

  it('should include socket bots in competitive multiplayer totals', () => {
    const players = new playerUtils.PlayerManager();
    const alice = new playerUtils.Player('alice');
    const bot = new playerUtils.Player('bot-1');

    alice.init({ x: 100, y: 100 }, 20);
    alice.name = 'Alice';
    bot.init({ x: 120, y: 120 }, 30);
    bot.name = 'Bot_One';
    playerKind.markBotPlayer(bot);

    players.pushNew(alice);
    players.pushNew(bot);

    expect(players.getTopPlayers()).to.deep.equal([
      {id: 'bot-1', name: 'Bot_One'},
      {id: 'alice', name: 'Alice'}
    ]);
    expect(players.getTotalMass()).to.equal(50);
  });

  it('should honor the multiplayer policy when bots are not competitive', () => {
    const players = new playerUtils.PlayerManager({
      botPlayers: {
        competitive: false
      }
    });
    const alice = new playerUtils.Player('alice');
    const bot = new playerUtils.Player('bot-1');

    alice.init({ x: 100, y: 100 }, 20);
    alice.name = 'Alice';
    bot.init({ x: 120, y: 120 }, 30);
    bot.name = 'Bot_One';
    playerKind.markBotPlayer(bot);

    players.pushNew(alice);
    players.pushNew(bot);

    expect(players.getTopPlayers()).to.deep.equal([{id: 'alice', name: 'Alice'}]);
    expect(players.getTotalMass()).to.equal(20);
  });
});
