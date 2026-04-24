/*jshint expr:true */

const expect = require('chai').expect;
const GhostRecorder = require('../../apps/server/src/ghost/recorder');

describe('ghost recorder', () => {
  it('should record trace, chat, and item events into the memory event store', () => {
    const events = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      sampleIntervalMs: 200,
      memoryStore: {
        recordEvent(event) {
          events.push(event);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      x: 120,
      y: 130,
      hue: 220,
      isNpc: false,
      bodyParts: [{ type: 'HAND', templateId: 'hand-open' }]
    };

    recorder.recordPlayers([player], 1200);
    recorder.recordChat(player, 'hello from now', 1220);
    recorder.recordItem(player, {
      type: 'HAND',
      templateId: 'hand-thread'
    }, { x: 140, y: 150 }, 1240);

    expect(events.map((event) => event.kind)).to.deep.equal([
      'ghost_trace',
      'ghost_chat',
      'ghost_item'
    ]);
    expect(events[0].payload.t).to.equal(200);
    expect(events[0].payload.x).to.equal(120);
    expect(events[1].payload.chat).to.equal('hello from now');
    expect(events[2].payload.part.templateId).to.equal('hand-thread');
  });
});
