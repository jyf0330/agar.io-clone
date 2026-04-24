'use strict';

var config = require('./body-signature-config');

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

function loadBodySignature(storageOverride) {
    var storage = getStorage(storageOverride);
    var raw;

    if (!storage) {
        return null;
    }

    raw = storage.getItem(config.storageKey);
    if (!raw) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function saveBodySignature(payload, storageOverride) {
    var storage = getStorage(storageOverride);
    var nextPayload = Object.assign({
        savedAt: Date.now()
    }, payload || {});

    if (storage) {
        storage.setItem(config.storageKey, JSON.stringify(nextPayload));
    }

    return nextPayload;
}

function clearBodySignature(storageOverride) {
    var storage = getStorage(storageOverride);

    if (storage) {
        storage.removeItem(config.storageKey);
    }
}

module.exports = {
    loadBodySignature: loadBodySignature,
    saveBodySignature: saveBodySignature,
    clearBodySignature: clearBodySignature
};
