'use strict';

const path = require('path');

const greetingsPool = require(path.resolve(process.cwd(), 'demo/critiques/greetings.json'));

function stableIndex(seed, length) {
    if (!length) {
        return 0;
    }

    let hash = 0;
    const text = String(seed || '');
    for (let i = 0; i < text.length; i += 1) {
        hash = (hash * 31 + text.charCodeAt(i)) % 2147483647;
    }

    return Math.abs(hash) % length;
}

function pickGreetingFallback(npcId, context) {
    const safeContext = context || {};
    const timeTag = safeContext.timeOfDay || '';
    const entries = greetingsPool.entries || [];
    const specific = entries.filter((entry) => entry.category === 'greeting' && entry.npcId === npcId);
    const general = entries.filter((entry) => entry.category === 'greeting' && entry.npcId === 'common');
    const taggedSpecific = specific.filter((entry) => !timeTag || (entry.tags || []).indexOf(timeTag) > -1);
    const taggedGeneral = general.filter((entry) => !timeTag || (entry.tags || []).indexOf(timeTag) > -1);
    const candidates = taggedSpecific.length ? taggedSpecific : (specific.length ? specific : (taggedGeneral.length ? taggedGeneral : general));

    if (!candidates.length) {
        return '今天很安静。';
    }

    const seed = [npcId, safeContext.timeOfDay, safeContext.playerX, safeContext.playerY].join(':');
    return candidates[stableIndex(seed, candidates.length)].text;
}

function buildContextualFallbackUtterance(npc, context) {
    const safeContext = context || {};
    const npcId = npc && npc.id ? npc.id : 'common';

    if (npcId === 'mochi') {
        switch (safeContext.timeOfDay) {
        case '凌晨':
            return '夜色有点轻。';
        case '早晨':
            return '早晨慢慢亮。';
        case '下午':
            return '下午的风很轻。';
        case '夜晚':
            return '夜里颜色更静。';
        default:
            break;
        }

        if (safeContext.npcColor) {
            return '今天像粉云。';
        }
    }

    return pickGreetingFallback(npcId, safeContext);
}

module.exports = {
    pickGreetingFallback: pickGreetingFallback,
    buildContextualFallbackUtterance: buildContextualFallbackUtterance
};
