'use strict';

function formatStats(stats) {
    const safeStats = stats || {};
    return Object.keys(safeStats).reduce((rows, key) => {
        if (typeof safeStats[key] === 'number' && safeStats[key] !== 0) {
            rows.push(key + ' +' + safeStats[key]);
        }
        return rows;
    }, []);
}

function findHistoryEvent(part, eventTypes) {
    const chain = Array.isArray(part && part.historyChain) ? part.historyChain : [];
    for (let index = chain.length - 1; index >= 0; index -= 1) {
        if (eventTypes.indexOf(chain[index].eventType) > -1) {
            return chain[index];
        }
    }

    return null;
}

function getAcquiredLabel(part) {
    const event = findHistoryEvent(part, ['stolen', 'picked', 'equipped', 'created']);
    if (!event) {
        return part.sourceType || 'unknown';
    }
    if (event.eventType === 'stolen') {
        return 'stolen from ' + (event.playerName || event.fromPlayerId || 'unknown');
    }
    if (event.eventType === 'picked') {
        if (part.sourceType === 'npc_reward') {
            return 'npc task reward';
        }
        if (part.sourceType === 'ghost_echo') {
            return 'ghost echo pickup';
        }
        return 'picked from map';
    }
    if (event.eventType === 'equipped') {
        return 'equipped this round';
    }

    return 'created';
}

function summarizePart(part) {
    const safePart = part || {};
    const droppedEvent = findHistoryEvent(safePart, ['dropped', 'replaced']);

    return {
        partId: safePart.partId || safePart.id || '',
        partType: safePart.partType || safePart.type || 'UNKNOWN',
        displayName: safePart.displayName || safePart.label || safePart.templateId || 'Unknown Part',
        stats: formatStats(safePart.stats),
        sourceType: safePart.sourceType || safePart.source || 'unknown',
        originPlayerId: safePart.originPlayerId || '',
        originPlayerName: safePart.originPlayerName || '',
        acquired: getAcquiredLabel(safePart),
        removed: Boolean(droppedEvent),
        removedEventType: droppedEvent ? droppedEvent.eventType : '',
        historyEventCount: Array.isArray(safePart.historyChain) ? safePart.historyChain.length : 0
    };
}

function summarizeHistoryEvent(part, event) {
    const safePart = part || {};
    const safeEvent = event || {};

    return {
        eventType: safeEvent.eventType || 'unknown',
        eventId: safeEvent.eventId || '',
        partId: safePart.partId || safePart.id || '',
        partType: safePart.partType || safePart.type || 'UNKNOWN',
        displayName: safePart.displayName || safePart.label || safePart.templateId || 'Unknown Part',
        playerId: safeEvent.playerId || '',
        playerName: safeEvent.playerName || '',
        fromPlayerId: safeEvent.fromPlayerId || '',
        toPlayerId: safeEvent.toPlayerId || '',
        sourceType: safeEvent.sourceType || safePart.sourceType || safePart.source || 'unknown',
        x: typeof safeEvent.x === 'number' ? safeEvent.x : null,
        y: typeof safeEvent.y === 'number' ? safeEvent.y : null,
        at: safeEvent.at || null
    };
}

function summarizeKeyEvents(parts) {
    return (parts || []).reduce((events, part) => {
        const chain = Array.isArray(part && part.historyChain) ? part.historyChain : [];
        chain.forEach((entry) => {
            if (entry && entry.eventType && entry.eventType !== 'created') {
                events.push(summarizeHistoryEvent(part, entry));
            }
        });
        return events;
    }, []).slice(-8);
}

function buildPetClosingLine(keyEvents) {
    const events = Array.isArray(keyEvents) ? keyEvents : [];
    if (!events.length) {
        return '';
    }

    const event = events[events.length - 1];
    const name = event.displayName || event.partType || 'Unknown Part';
    if (event.eventType === 'picked') {
        return '这局你真的捡到了 ' + name + '。';
    }
    if (event.eventType === 'stolen') {
        return '这局你真的抢到了 ' + name + '。';
    }
    if (event.eventType === 'replaced' || event.eventType === 'dropped') {
        return '这局 ' + name + ' 发生过换装流转。';
    }

    return '这局 ' + name + ' 留下了真实记录。';
}

function buildSettlementSummary(options) {
    const settings = options || {};
    const player = settings.player || {};
    const bodyParts = player.bodyParts || [];
    const keyEvents = Array.isArray(settings.keyEvents) ? settings.keyEvents : summarizeKeyEvents(bodyParts);

    return {
        playerId: player.id || '',
        playerName: player.name || '',
        endedReason: settings.endedReason || 'round_end',
        winnerName: settings.winnerName || '',
        bodyParts: bodyParts.map(summarizePart),
        keyEvents: keyEvents,
        historyWritten: Boolean(settings.historyWritten),
        recordingConsent: settings.recordingConsent !== false,
        petClosingLine: settings.petClosingLine || buildPetClosingLine(keyEvents)
    };
}

function isDemoSettlementRequest(message) {
    return /^(?:demo\s*settle|demo\s*结算|快速结算)$/i.test(String(message || '').trim());
}

module.exports = {
    buildPetClosingLine: buildPetClosingLine,
    buildSettlementSummary: buildSettlementSummary,
    isDemoSettlementRequest: isDemoSettlementRequest,
    summarizeKeyEvents: summarizeKeyEvents,
    summarizePart: summarizePart
};
