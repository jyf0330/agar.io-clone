'use strict';

function createSeededRandom(seed) {
    let value = Number(seed || 1) >>> 0;
    if (!value) {
        value = 1;
    }

    return function seededRandom() {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 0x100000000;
    };
}

function pickRandom(items, random) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
        return null;
    }
    const nextRandom = random || Math.random;
    const index = Math.min(list.length - 1, Math.floor(nextRandom() * list.length));
    return list[index];
}

module.exports = {
    createSeededRandom,
    pickRandom
};
