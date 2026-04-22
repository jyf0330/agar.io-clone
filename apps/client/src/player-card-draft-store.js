'use strict';

var playerCardLayers = require('./player-card-layers');

var STORAGE_KEY = 'agar.playerCardDrafts';
var DEFAULT_MAX_DRAFTS = 20;

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

function createDraftId(nowProvider) {
    var now = typeof nowProvider === 'function' ? nowProvider() : Date.now();
    return 'draft-' + now;
}

function normalizeDraftPayload(payload, options) {
    if (!payload) {
        return null;
    }

    var nowProvider = options && options.nowProvider;
    var nowIso = new Date(typeof nowProvider === 'function' ? nowProvider() : Date.now()).toISOString();
    var layers = payload.layers || playerCardLayers.createLegacyLayerPayload(payload.canvasJson);
    var mergedCanvasJson = payload.canvasJson || playerCardLayers.mergeLayerPayloadToCanvasJson(layers);

    return {
        id: payload.id || createDraftId(nowProvider),
        previewDataUrl: payload.previewDataUrl,
        canvasJson: mergedCanvasJson,
        activeLayerId: payload.activeLayerId || 'base',
        contentScale: payload.contentScale || 1,
        layers: playerCardLayers.createLayerPayload(layers),
        createdAt: payload.createdAt || nowIso,
        updatedAt: payload.updatedAt || nowIso
    };
}

function loadDrafts(storageOverride) {
    var storage = getStorage(storageOverride);
    if (!storage) {
        return [];
    }

    var raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }

    return JSON.parse(raw).map(function (draft) {
        return normalizeDraftPayload(draft, {});
    });
}

function saveDraft(payload, storageOverride, options) {
    var storage = getStorage(storageOverride);
    if (!storage) {
        return null;
    }

    var normalizedDraft = normalizeDraftPayload(payload, options || {});
    var existingDrafts = loadDrafts(storageOverride).filter(function (draft) {
        return draft.id !== normalizedDraft.id;
    });
    existingDrafts.unshift(normalizedDraft);
    existingDrafts = existingDrafts.slice(0, (options && options.maxDrafts) || DEFAULT_MAX_DRAFTS);
    storage.setItem(STORAGE_KEY, JSON.stringify(existingDrafts));
    return normalizedDraft;
}

module.exports = {
    loadDrafts: loadDrafts,
    saveDraft: saveDraft,
    normalizeDraftPayload: normalizeDraftPayload
};
