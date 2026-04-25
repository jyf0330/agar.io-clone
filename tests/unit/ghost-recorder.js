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
      recordPlayerTraces: true,
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

  it('should keep continuous movement recording off by default', () => {
    const events = [];
    const traces = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      memoryStore: {
        recordEvent(event) {
          events.push(event);
        },
        recordPlayerTrace(trace) {
          traces.push(trace);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      x: 120,
      y: 130,
      consentToRecord: true
    };

    recorder.recordPlayers([player], 1200);

    expect(events).to.deep.equal([]);
    expect(traces).to.deep.equal([]);
  });

  it('should sanitize sensitive ghost chat before recording replay material', () => {
    const events = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      recordPlayerTraces: true,
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
      recordPlayerTraces: true,
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

  it('should record player session metadata for historical echo replay eligibility', () => {
    const sessions = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      mapId: 'fixed-arena',
      memoryStore: {
        recordSession(session) {
          sessions.push(session);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      consentToRecord: true,
      isReplayAllowed: true
    };

    recorder.recordPlayerSession(player, 1200);

    expect(sessions[0]).to.deep.include({
      sessionId: 'session-now',
      playerId: 'player-1',
      playerName: 'Live Huy',
      mapId: 'fixed-arena',
      consentToRecord: true,
      startedAt: 1000,
      endedAt: null,
      isSeed: false,
      isReplayAllowed: true
    });
  });

  it('should mirror recorded movement into typed player trace rows', () => {
    const traces = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      recordPlayerTraces: true,
      memoryStore: {
        recordEvent() {},
        recordPlayerTrace(trace) {
          traces.push(trace);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      x: 120,
      y: 130,
      massTotal: 42,
      cells: [{radius: 24}],
      consentToRecord: true
    };

    recorder.recordPlayers([player], 1200);

    expect(traces[0]).to.deep.include({
      sessionId: 'session-now',
      playerId: 'player-1',
      t: 200,
      x: 120,
      y: 130,
      size: 24,
      mass: 42,
      alive: true,
      ts: 1200
    });
  });

  it('should mirror recorded chat into typed chat records', () => {
    const chats = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      memoryStore: {
        recordEvent() {},
        recordChatRecord(chat) {
          chats.push(chat);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      x: 120,
      y: 130,
      consentToRecord: true
    };

    recorder.recordChat(player, 'hello from now', 1220);

    expect(chats[0]).to.deep.include({
      sessionId: 'session-now',
      playerId: 'player-1',
      playerName: 'Live Huy',
      t: 220,
      x: 120,
      y: 130,
      text: 'hello from now',
      replayAllowed: true,
      ts: 1220
    });
  });

  it('should mirror recorded item pickups into typed item events', () => {
    const itemEvents = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      memoryStore: {
        recordEvent() {},
        recordItemEvent(event) {
          itemEvents.push(event);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      consentToRecord: true
    };

    recorder.recordItem(player, { type: 'HAND', templateId: 'hand-open' }, { x: 140, y: 150 }, 1240);

    expect(itemEvents[0]).to.deep.include({
      sessionId: 'session-now',
      playerId: 'player-1',
      eventType: 'part_pickup',
      t: 240,
      x: 140,
      y: 150,
      ts: 1240
    });
    expect(itemEvents[0].payload.part.templateId).to.equal('hand-open');
  });

  it('should mirror part lifecycle events into typed part events', () => {
    const partEvents = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      memoryStore: {
        recordEvent() {},
        recordPartEvent(event) {
          partEvents.push(event);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      consentToRecord: true
    };

    recorder.recordPartEvent(player, 'part_equipped', { type: 'HAND', templateId: 'hand-open' }, { x: 150, y: 160 }, 1260);

    expect(partEvents[0]).to.deep.include({
      sessionId: 'session-now',
      playerId: 'player-1',
      eventType: 'part_equipped',
      t: 260,
      x: 150,
      y: 160,
      ts: 1260
    });
    expect(partEvents[0].payload.part.templateId).to.equal('hand-open');
  });

  it('should mirror combat events into typed combat events', () => {
    const combatEvents = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      memoryStore: {
        recordEvent() {},
        recordCombatEvent(event) {
          combatEvents.push(event);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      consentToRecord: true
    };
    const target = {
      id: 'player-2',
      name: 'Target Huy'
    };

    recorder.recordCombatEvent(player, 'kill', target, { x: 170, y: 180 }, 1280);

    expect(combatEvents[0]).to.deep.include({
      sessionId: 'session-now',
      playerId: 'player-1',
      eventType: 'kill',
      t: 280,
      x: 170,
      y: 180,
      ts: 1280
    });
    expect(combatEvents[0].payload.targetPlayerId).to.equal('player-2');
  });

  it('should generate ghost anchors from replayable chat, part, and combat events', () => {
    const anchors = [];
    const recorder = new GhostRecorder({
      sessionId: 'session-now',
      startedAt: 1000,
      mapId: 'fixed-arena',
      memoryStore: {
        recordEvent() {},
        recordChatRecord() {},
        recordPartEvent() {},
        recordCombatEvent() {},
        recordGhostAnchor(anchor) {
          anchors.push(anchor);
        }
      }
    });
    const player = {
      id: 'player-1',
      name: 'Live Huy',
      x: 120,
      y: 130,
      consentToRecord: true
    };

    recorder.recordChat(player, 'hello from now', 1220);
    recorder.recordPartEvent(player, 'part_pickup', { type: 'HAND' }, { x: 150, y: 160 }, 1260);
    recorder.recordCombatEvent(player, 'kill', { id: 'target-1', name: 'Target' }, { x: 170, y: 180 }, 1280);

    expect(anchors.map((anchor) => anchor.eventType)).to.deep.equal([
      'chat_message',
      'part_pickup',
      'kill'
    ]);
    expect(anchors[0]).to.deep.include({
      sourceSessionId: 'session-now',
      sourcePlayerId: 'player-1',
      mapId: 'fixed-arena',
      t: 220,
      x: 120,
      y: 130
    });
  });
});
