'use strict';

var avatarDraftConfig = require('./avatar-draft-config');

var STORAGE_KEY = 'agar.avatarDraftHistory';

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

function loadHistory(storageOverride) {
    var storage = getStorage(storageOverride);
    if (!storage) {
        return [];
    }

    var raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }

    return JSON.parse(raw);
}

function saveHistory(entries, storageOverride) {
    var storage = getStorage(storageOverride);
    if (!storage) {
        return [];
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return entries;
}

function addHistoryEntry(entry, storageOverride, maxCount) {
    var historyEntries = loadHistory(storageOverride).slice();
    historyEntries.unshift(entry);
    historyEntries = historyEntries.slice(0, maxCount || avatarDraftConfig.historyMaxCount);
    saveHistory(historyEntries, storageOverride);
    return historyEntries;
}

function createHistoryEntry(payload) {
    return {
        id: 'history-' + Date.now(),
        templateId: payload.templateId,
        missingPartType: payload.missingPartType,
        previewDataUrl: payload.previewDataUrl,
        createdAt: new Date().toISOString()
    };
}

module.exports = {
    loadHistory: loadHistory,
    saveHistory: saveHistory,
    addHistoryEntry: addHistoryEntry,
    createHistoryEntry: createHistoryEntry
};
