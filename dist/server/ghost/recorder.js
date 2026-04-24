"use strict";

const path = require('path');
const body = require('../body');
function loadForbiddenWords() {
  try {
    const pool = require(path.resolve(process.cwd(), 'demo/critiques/pool.json'));
    return pool && pool.meta && Array.isArray(pool.meta.forbiddenWords) ? pool.meta.forbiddenWords : [];
  } catch (_error) {
    return [];
  }
}
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const forbiddenWords = loadForbiddenWords();
function sanitizeReplayChat(text) {
  let sanitized = String(text || '');
  sanitized = sanitized.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]');
  sanitized = sanitized.replace(/https?:\/\/\S+|www\.\S+/gi, '[link]');
  sanitized = sanitized.replace(/\+?\d[\d\s-]{8,}\d/g, '[phone]');
  forbiddenWords.forEach(word => {
    if (!word) {
      return;
    }
    sanitized = sanitized.replace(new RegExp(escapeRegExp(word), 'g'), '[filtered]');
  });
  return sanitized;
}
class GhostRecorder {
  constructor(options) {
    const settings = options || {};
    this.sessionId = settings.sessionId || String(Date.now());
    this.startedAt = settings.startedAt || Date.now();
    this.sampleIntervalMs = settings.sampleIntervalMs || 200;
    this.memoryStore = settings.memoryStore || null;
    this.mapId = settings.mapId || 'default-map';
    this.isSeed = settings.isSeed === true;
    this.lastTraceAtByPlayer = {};
  }
  getElapsed(now) {
    return Math.max(0, now - this.startedAt);
  }
  canRecordPlayer(player) {
    return player && player.consentToRecord !== false && player.isReplayAllowed !== false;
  }
  recordEvent(player, kind, payload, now) {
    if (!this.memoryStore || typeof this.memoryStore.recordEvent !== 'function' || !this.canRecordPlayer(player)) {
      return;
    }
    this.memoryStore.recordEvent({
      playerId: player.id,
      npcId: '',
      sessionId: this.sessionId,
      kind: kind,
      payload: Object.assign({
        sessionId: this.sessionId,
        ghostId: player.id,
        name: player.name || '',
        t: this.getElapsed(now || Date.now())
      }, payload || {}),
      ts: now || Date.now()
    });
  }
  recordPlayers(players, now) {
    (players || []).forEach(player => {
      if (!this.canRecordPlayer(player) || player.isNpc) {
        return;
      }
      const lastTraceAt = this.lastTraceAtByPlayer[player.id] || 0;
      if (lastTraceAt && now - lastTraceAt < this.sampleIntervalMs) {
        return;
      }
      this.lastTraceAtByPlayer[player.id] = now;
      const tracePayload = {
        x: player.x,
        y: player.y,
        hue: player.hue,
        bodyParts: (player.bodyParts || []).map(part => body.cloneBodyPart(part))
      };
      this.recordEvent(player, 'ghost_trace', tracePayload, now);
      this.recordPlayerTrace(player, tracePayload, now);
    });
  }
  recordPlayerTrace(player, tracePayload, now) {
    if (!this.memoryStore || typeof this.memoryStore.recordPlayerTrace !== 'function' || !this.canRecordPlayer(player)) {
      return;
    }
    const cells = player.cells || [];
    this.memoryStore.recordPlayerTrace({
      sessionId: this.sessionId,
      playerId: player.id,
      t: this.getElapsed(now || Date.now()),
      x: tracePayload.x,
      y: tracePayload.y,
      size: cells[0] && typeof cells[0].radius === 'number' ? cells[0].radius : null,
      mass: typeof player.massTotal === 'number' ? player.massTotal : null,
      alive: cells.length > 0,
      ts: now || Date.now()
    });
  }
  recordPlayerSession(player, now) {
    if (!this.memoryStore || typeof this.memoryStore.recordSession !== 'function' || !player) {
      return;
    }
    this.memoryStore.recordSession({
      sessionId: this.sessionId,
      playerId: player.id,
      playerName: player.name || '',
      mapId: this.mapId,
      consentToRecord: player.consentToRecord !== false,
      startedAt: this.startedAt,
      endedAt: null,
      isSeed: this.isSeed,
      isReplayAllowed: player.isReplayAllowed !== false,
      ts: now || Date.now()
    });
  }
  recordChat(player, message, now) {
    const sanitized = sanitizeReplayChat(message).substring(0, 140);
    this.recordEvent(player, 'ghost_chat', {
      x: player.x,
      y: player.y,
      chat: sanitized
    }, now);
    this.recordChatRecord(player, sanitized, now);
  }
  recordChatRecord(player, text, now) {
    if (!this.memoryStore || typeof this.memoryStore.recordChatRecord !== 'function' || !this.canRecordPlayer(player)) {
      return;
    }
    this.memoryStore.recordChatRecord({
      sessionId: this.sessionId,
      playerId: player.id,
      playerName: player.name || '',
      t: this.getElapsed(now || Date.now()),
      x: player.x,
      y: player.y,
      text: text,
      replayAllowed: true,
      ts: now || Date.now()
    });
  }
  recordItem(player, part, position, now) {
    const payload = {
      x: position.x,
      y: position.y,
      part: body.cloneBodyPart(part)
    };
    this.recordEvent(player, 'ghost_item', payload, now);
    this.recordItemEvent(player, 'part_pickup', payload, now);
  }
  recordItemEvent(player, eventType, payload, now) {
    if (!this.memoryStore || typeof this.memoryStore.recordItemEvent !== 'function' || !this.canRecordPlayer(player)) {
      return;
    }
    const elapsed = this.getElapsed(now || Date.now());
    this.memoryStore.recordItemEvent({
      eventId: [this.sessionId, player.id, eventType, elapsed, payload.x, payload.y].join(':'),
      sessionId: this.sessionId,
      playerId: player.id,
      eventType: eventType,
      t: elapsed,
      x: payload.x,
      y: payload.y,
      payload: {
        part: payload.part
      },
      ts: now || Date.now()
    });
  }
  recordPartEvent(player, eventType, part, position, now, payload) {
    const eventPosition = position || {};
    const eventPayload = Object.assign({
      x: eventPosition.x,
      y: eventPosition.y,
      part: body.cloneBodyPart(part)
    }, payload || {});
    this.recordEvent(player, eventType, eventPayload, now);
    this.recordPartLifecycleEvent(player, eventType, eventPayload, now);
  }
  recordPartLifecycleEvent(player, eventType, payload, now) {
    if (!this.memoryStore || typeof this.memoryStore.recordPartEvent !== 'function' || !this.canRecordPlayer(player)) {
      return;
    }
    const elapsed = this.getElapsed(now || Date.now());
    this.memoryStore.recordPartEvent({
      eventId: [this.sessionId, player.id, eventType, elapsed, payload.x, payload.y].join(':'),
      sessionId: this.sessionId,
      playerId: player.id,
      eventType: eventType,
      t: elapsed,
      x: payload.x,
      y: payload.y,
      payload: payload,
      ts: now || Date.now()
    });
  }
  recordCombatEvent(player, eventType, target, position, now, payload) {
    const eventPosition = position || {};
    this.recordEvent(player, eventType, Object.assign({
      x: eventPosition.x,
      y: eventPosition.y,
      targetPlayerId: target && target.id ? target.id : '',
      targetPlayerName: target && target.name ? target.name : ''
    }, payload || {}), now);
  }
}
module.exports = GhostRecorder;
module.exports.sanitizeReplayChat = sanitizeReplayChat;