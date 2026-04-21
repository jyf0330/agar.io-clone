'use strict';

var STORAGE_KEY = 'agar.playerCard';
var playerCardLayers = require('./player-card-layers');

function getStorage(storageOverride) {
    if (storageOverride) {
        return storageOverride;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
    }

    if (typeof global !== 'undefined' && global.localStorage) {
        return global.localStorage;
    }

    return null;
}

function loadPlayerCard(storageOverride) {
    var storage = getStorage(storageOverride);
    if (!storage) {
        return null;
    }

    var raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
        return null;
    }

    return normalizePlayerCardPayload(JSON.parse(raw));
}

function savePlayerCard(payload, storageOverride) {
    var storage = getStorage(storageOverride);
    if (!storage) {
        return null;
    }

    var normalizedPayload = normalizePlayerCardPayload(payload);
    storage.setItem(STORAGE_KEY, JSON.stringify(normalizedPayload));
    return normalizedPayload;
}

function clearPlayerCard(storageOverride) {
    var storage = getStorage(storageOverride);
    if (!storage) {
        return;
    }

    storage.removeItem(STORAGE_KEY);
}

module.exports = {
    loadPlayerCard: loadPlayerCard,
    savePlayerCard: savePlayerCard,
    clearPlayerCard: clearPlayerCard
};

function normalizePlayerCardPayload(payload) {
    if (!payload) {
        return payload;
    }

    var layers = payload.layers || playerCardLayers.createLegacyLayerPayload(payload.canvasJson);
    var mergedCanvasJson = payload.canvasJson || playerCardLayers.mergeLayerPayloadToCanvasJson(layers);

    return Object.assign({}, payload, {
        canvasJson: mergedCanvasJson,
        activeLayerId: payload.activeLayerId || 'base',
        layers: playerCardLayers.createLayerPayload(layers)
    });
}
