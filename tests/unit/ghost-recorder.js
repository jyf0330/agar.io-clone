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

  it('should sanitize sensitive ghost chat before recording replay material', () => {
    const events = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
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
      y: 130
    };

    recorder.recordChat(player, 'call 13812345678 mail a@b.com see https://example.com 死亡', 1220);

    expect(events[0].payload.chat).to.contain('[phone]');
    expect(events[0].payload.chat).to.contain('[email]');
    expect(events[0].payload.chat).to.contain('[link]');
    expect(events[0].payload.chat).to.contain('[filtered]');
    expect(events[0].payload.chat).to.not.contain('13812345678');
    expect(events[0].payload.chat).to.not.contain('a@b.com');
    expect(events[0].payload.chat).to.not.contain('https://example.com');
    expect(events[0].payload.chat).to.not.contain('死亡');
  });

  it('should skip replay recording for players who declined consent', () => {
    const events = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      memoryStore: {
        recordEvent(event) {
          events.push(event);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Private Huy',
      x: 120,
      y: 130,
      consentToRecord: false,
      isReplayAllowed: false
    };

    recorder.recordPlayers([player], 1200);
    recorder.recordChat(player, 'do not replay me', 1220);
    recorder.recordItem(player, { type: 'HAND' }, { x: 140, y: 150 }, 1240);
    recorder.recordPartEvent(player, 'part_pickup', { type: 'HAND' }, { x: 150, y: 160 }, 1260);
    recorder.recordCombatEvent(player, 'kill', { id: 'target-1', name: 'Target' }, { x: 170, y: 180 }, 1280);

    expect(events).to.deep.equal([]);
  });
});
