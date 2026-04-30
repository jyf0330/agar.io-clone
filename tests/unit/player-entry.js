/*jshint expr:true */

const expect = require('chai').expect;
const playerEntry = require('../../apps/server/src/player-entry');
const playerUtils = require('../../apps/server/src/map/player');

describe('player-entry.js', () => {
  it('should normalize a shared player entry payload for humans and socket bots', () => {
    const payload = playerEntry.normalizePlayerEntryPayload({
      name: '<b>Bot Alice</b>',
      screenWidth: '1280',
      screenHeight: 720,
      playerCardPreviewDataUrl: 'data:image/png;base64,card',
      bodySignature: {
        slotType: 'FOOT',
        templateId: 'foot-default'
      },
      bodyAssembly: {
        selectedParts: {
          foot: 'foot-default'
        }
      },
      consentToRecord: false,
      isReplayAllowed: false,
      isBot: true
    });

    expect(payload).to.deep.equal({
      name: 'Bot Alice',
      screenWidth: 1280,
      screenHeight: 720,
      playerCardPreviewDataUrl: 'data:image/png;base64,card',
      bodySignature: {
        slotType: 'FOOT',
        templateId: 'foot-default'
      },
      bodyAssembly: {
        selectedParts: {
          foot: 'foot-default'
        }
      },
      consentToRecord: false,
      isReplayAllowed: false,
      isBot: true
    });
  });

  it('should apply the shared entry payload to a bot player without using npc flags', () => {
    const player = new playerUtils.Player('bot-socket-1');

    playerEntry.applyPlayerEntryPayload(player, {
      name: 'Socket Bot',
      screenWidth: 1024,
      screenHeight: 768,
      isBot: true
    });

    expect(player.name).to.equal('Socket Bot');
    expect(player.screenWidth).to.equal(1024);
    expect(player.screenHeight).to.equal(768);
    expect(player.playerKind).to.equal('bot');
    expect(player.isBot).to.equal(true);
    expect(player.isNpc).to.equal(false);
  });
});
