'use strict';

var STORAGE_KEY = 'agar.playerCard';

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

    return JSON.parse(raw);
}

function savePlayerCard(payload, storageOverride) {
    var storage = getStorage(storageOverride);
    if (!storage) {
        return null;
    }

    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return payload;
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
