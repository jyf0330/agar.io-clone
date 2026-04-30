'use strict';

const body = require('./body');
const playerKind = require('./player-kind');

function stripTags(value) {
    return String(value || '').replace(/(<([^>]+)>)/ig, '');
}

function normalizeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function cloneObject(value) {
    return value && typeof value === 'object' ? Object.assign({}, value) : null;
}

function normalizePlayerEntryPayload(payload) {
    const safePayload = payload || {};
    const consentToRecord = safePayload.consentToRecord !== false;

    return {
        name: stripTags(safePayload.name).substring(0, 25),
        screenWidth: normalizeNumber(safePayload.screenWidth, null),
        screenHeight: normalizeNumber(safePayload.screenHeight, null),
        playerCardPreviewDataUrl: safePayload.playerCardPreviewDataUrl || null,
        bodySignature: cloneObject(safePayload.bodySignature),
        bodyAssembly: cloneObject(safePayload.bodyAssembly),
        consentToRecord: consentToRecord,
        isReplayAllowed: consentToRecord && safePayload.isReplayAllowed !== false,
        isBot: safePayload.isBot === true
    };
}

function applyPlayerEntryPayload(player, payload) {
    const normalized = normalizePlayerEntryPayload(payload);

    if (normalized.isBot) {
        playerKind.markBotPlayer(player);
    } else if (playerKind.getPlayerKind(player) !== playerKind.PLAYER_KIND_NPC) {
        playerKind.markHumanPlayer(player);
    }

    player.name = normalized.name;
    player.screenWidth = normalized.screenWidth;
    player.screenHeight = normalized.screenHeight;
    player.playerCardPreviewDataUrl = normalized.playerCardPreviewDataUrl;
    player.bodyAssembly = normalized.bodyAssembly;
    player.bodySignature = normalized.bodySignature;
    player.consentToRecord = normalized.consentToRecord;
    player.isReplayAllowed = normalized.isReplayAllowed;
    body.applyBodyState(player, {
        bodySignature: player.bodySignature
    });

    return normalized;
}

module.exports = {
    normalizePlayerEntryPayload,
    applyPlayerEntryPayload
};
