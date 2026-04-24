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

function buildSettlementSummary(options) {
    const settings = options || {};
    const player = settings.player || {};

    return {
        playerId: player.id || '',
        playerName: player.name || '',
        endedReason: settings.endedReason || 'round_end',
        winnerName: settings.winnerName || '',
        bodyParts: (player.bodyParts || []).map(summarizePart),
        historyWritten: Boolean(settings.historyWritten),
        recordingConsent: settings.recordingConsent !== false,
        petClosingLine: settings.petClosingLine || ''
    };
}

module.exports = {
    buildSettlementSummary: buildSettlementSummary,
    summarizePart: summarizePart
};
