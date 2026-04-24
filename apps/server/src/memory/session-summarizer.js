'use strict';

const store = require('./store');
const wrapper = require('../llm/wrapper');
const {buildSummarizeSessionPrompt} = require('../npc/prompts');
const path = require('path');
const expectationPool = require(path.resolve(process.cwd(), 'demo/critiques/expectations.json'));

const fallbackTemplates = [
    '{npcName}记下了这一局：你靠近花园、回应了它，关系微微变亮。',
    '{npcName}觉得你今天停留得很久，颜色偏柔和，它愿意下次再靠近。',
    '{npcName}看见你和大家说话，关系小幅上升，心情保持安静。',
    '{npcName}记住了你的一次互动，虽然细节很少，但它没有疏远。',
    '{npcName}觉得这一局像试探，关系变化不大，仍然愿意等你回来。',
    '{npcName}注意到你经过它身边，主色不明，感受是好奇。',
    '{npcName}把本局记成短短一页：你出现、移动、留下痕迹。',
    '{npcName}觉得你没有伤害它，关系稳定，下一局可以继续观察。',
    '{npcName}记下你和 NPC 的几次回应，主色偏亮，感受温和。',
    '{npcName}保留了这局的轮廓：互动不多，但它认得你来过。'
];

function normalizeText(text, fallback) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value || value.indexOf('MOCK:') === 0) {
        return fallback;
    }

    return value.slice(0, 80);
}

function getNpcName(npc) {
    return npc && npc.player && npc.player.name ? npc.player.name : npc && npc.id ? npc.id : 'NPC';
}

function buildFallbackSummary(npc, events) {
    const eventCount = Array.isArray(events) ? events.length : 0;
    const index = Math.abs(String(npc && npc.id ? npc.id : 'npc').split('').reduce((sum, char) => {
        return sum + char.charCodeAt(0);
    }, eventCount)) % fallbackTemplates.length;

    return fallbackTemplates[index].replace('{npcName}', getNpcName(npc)).slice(0, 80);
}

function getScoring(npc) {
    return npc
        && npc.personality
        && npc.personality.relationship_schema
        && npc.personality.relationship_schema.scoring
        ? npc.personality.relationship_schema.scoring
        : {};
}

function getEventText(events) {
    return (Array.isArray(events) ? events : []).map((event) => {
        const payload = event.payload || {};
        return [
            event.kind || '',
            payload.text || '',
            payload.message || '',
            payload.reason || '',
            payload.type || ''
        ].join(' ');
    }).join(' ');
}

function estimateRelationshipDelta(events, npc, previousSummary) {
    const rows = Array.isArray(events) ? events : [];
    const scoring = getScoring(npc);
    let score = rows.reduce((total, event) => {
        if (event.kind === 'player_chat' || event.kind === 'npc_chat_reply') {
            return total + (scoring.player_greets_on_return || 1);
        }
        if (event.kind === 'npc_paint') {
            return total + (scoring.player_paints_me_any_color || scoring.player_paints_cool_color || 1);
        }
        return total;
    }, 0);

    if (!rows.length && typeof scoring.player_ignores_me_whole_round === 'number') {
        score += scoring.player_ignores_me_whole_round;
    }

    const previousExpectation = previousSummary && previousSummary.expectation ? previousSummary.expectation : '';
    if (/花/.test(previousExpectation) && !/花/.test(getEventText(rows))) {
        score -= 2;
    }

    return Math.max(-10, Math.min(10, score));
}

function buildTomorrowExpectation(npc, events) {
    const entries = Array.isArray(expectationPool.entries) ? expectationPool.entries : [];
    const npcEntries = entries.filter((entry) => entry.npcId === (npc && npc.id));
    const genericEntries = entries.filter((entry) => entry.npcId === '*');
    const candidates = npcEntries.length ? npcEntries : genericEntries;
    if (!candidates.length) {
        return '明天回来时，给花园留一笔吧。';
    }

    const eventCount = Array.isArray(events) ? events.length : 0;
    const index = Math.abs(String(npc && npc.id ? npc.id : 'npc').split('').reduce((sum, char) => {
        return sum + char.charCodeAt(0);
    }, eventCount)) % candidates.length;

    return candidates[index].text;
}

function collectReferencedL1EventIds(events) {
    return (Array.isArray(events) ? events : []).map((event) => {
        return event.eventId || (event.id ? String(event.id) : '');
    }).filter(Boolean).slice(0, 50);
}

async function summarizeNpcSession(options) {
    const settings = options || {};
    const npc = settings.npc || {};
    const memoryStore = settings.store || store;
    const ask = settings.ask || wrapper.ask;
    const sessionId = settings.sessionId;
    const playerId = settings.playerId || '';
    const events = memoryStore.listEvents({
        sessionId: sessionId,
        npcId: npc.id,
        limit: 50
    });
    const previousSummary = memoryStore.listSessionSummaries({
        playerId: playerId,
        npcId: npc.id,
        limit: 1
    })[0] || null;
    const fallback = buildFallbackSummary(npc, events);
    const expectation = buildTomorrowExpectation(npc, events);
    let summary = fallback;

    try {
        const prompt = buildSummarizeSessionPrompt(npc, events);
        const result = await ask('summarize_session', {
            npcId: npc.id,
            sessionId: sessionId,
            eventCount: events.length
        }, {
            timeoutMs: settings.timeoutMs || 4000,
            useCache: false,
            prompt: prompt
        });

        if (result && result.ok) {
            summary = normalizeText(result.text, fallback);
        }
    } catch (_error) {
        summary = fallback;
    }

    const saved = memoryStore.addSessionSummary({
        playerId: playerId,
        npcId: npc.id,
        sessionId: sessionId,
        summary: summary,
        expectation: expectation,
        referencedL1EventIds: collectReferencedL1EventIds(events),
        relationshipDelta: estimateRelationshipDelta(events, npc, previousSummary),
        ts: settings.ts || Date.now()
    });

    return Object.assign({
        npcId: npc.id,
        summary: summary,
        expectation: expectation
    }, saved);
}

async function summarizeSession(options) {
    const settings = options || {};
    const npcs = Array.isArray(settings.npcs) ? settings.npcs : [];
    const results = [];

    for (const npc of npcs) {
        results.push(await summarizeNpcSession(Object.assign({}, settings, {
            npc: npc
        })));
    }

    return results;
}

module.exports = {
    buildFallbackSummary: buildFallbackSummary,
    buildTomorrowExpectation: buildTomorrowExpectation,
    collectReferencedL1EventIds: collectReferencedL1EventIds,
    estimateRelationshipDelta: estimateRelationshipDelta,
    summarizeNpcSession: summarizeNpcSession,
    summarizeSession: summarizeSession
};
