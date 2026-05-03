'use strict';

const HASH_MOD = 4294967291;

function hashString(value) {
    var hash = 0;
    for (var index = 0; index < value.length; index++) {
        hash = ((hash * 31) + value.charCodeAt(index)) % HASH_MOD;
    }
    return hash.toString(36);
}

function createValueSignature(value) {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'undefined') {
        return 'undefined';
    }
    if (typeof value === 'string') {
        return 's:' + value.length + ':' + hashString(value);
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
        return typeof value + ':' + String(value);
    }
    if (Array.isArray(value)) {
        return 'a:' + value.length + '[' + value.map(createValueSignature).join('|') + ']';
    }
    if (typeof value === 'object') {
        var keys = Object.keys(value).sort();
        return 'o:' + keys.length + '{' + keys.map(function (key) {
            return key + ':' + createValueSignature(value[key]);
        }).join('|') + '}';
    }
    return typeof value + ':' + String(value);
}

function createPlayerMetaSignature(meta) {
    return createValueSignature(meta);
}

module.exports = {
    createPlayerMetaSignature: createPlayerMetaSignature,
    createValueSignature: createValueSignature
};
