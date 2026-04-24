'use strict';

const store = require('./store');
const wrapper = require('../llm/wrapper');
const {buildUpdatePersonaImpressionPrompt} = require('../npc/prompts');

function clampRelationshipValue(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round(parsed)));
}

function parsePersonaResponse(text) {
    const rawText = String(text || '').trim();
    if (!rawText || rawText.indexOf('MOCK:') === 0) {
        return null;
    }

    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonText = fencedMatch ? fencedMatch[1].trim() : rawText;
    const parsed = JSON.parse(jsonText);

    return {
        impression: String(parsed.impression || '').slice(0, 150),
        relationshipValue: clampRelationshipValue(parsed.relationshipValue)
    };
}

function buildFallbackImpression(npc, summaries, currentImpression) {
    const latest = Array.isArray(summaries) ? summaries.slice(0, 5) : [];
    const text = latest.map((summary) => summary.summary).filter(Boolean).join(' ');
    const previous = currentImpression && currentImpression.impression ? currentImpression.impression + ' ' : '';
    const npcName = npc && npc.player && npc.player.name ? npc.player.name : npc && npc.id ? npc.id : 'NPC';

    return (previous + npcName + '记得玩家最近几局常来互动。' + text).replace(/\s+/g, ' ').trim().slice(0, 150);
}

function shouldUpdateFromSummaryCount(count) {
    return count >= 5 && count % 5 === 0;
}

function collectEvidenceEventIds(summaries) {
    const seen = {};
    return (Array.isArray(summaries) ? summaries : []).reduce((ids, summary) => {
        const referencedIds = Array.isArray(summary.referencedL1EventIds) ? summary.referencedL1EventIds : [];
        referencedIds.forEach((eventId) => {
            if (eventId && !seen[eventId]) {
                seen[eventId] = true;
                ids.push(eventId);
            }
        });
        return ids;
    }, []).slice(0, 50);
}

async function updateNpcPersona(options) {
    const settings = options || {};
    const npc = settings.npc || {};
    const memoryStore = settings.store || store;
    const ask = settings.ask || wrapper.ask;
    const playerId = settings.playerId || '';
    const summaries = memoryStore.listSessionSummaries({
        playerId: playerId,
        npcId: npc.id,
        limit: 1000
    });

    if (!shouldUpdateFromSummaryCount(summaries.length)) {
        return {
            skipped: true,
            npcId: npc.id,
            summaryCount: summaries.length
        };
    }

    const recentSummaries = summaries.slice(0, 5);
    const evidenceEventIds = collectEvidenceEventIds(recentSummaries);
    const currentImpression = memoryStore.getPersonaImpression(playerId, npc.id);
    const fallbackRelationship = clampRelationshipValue(
        (currentImpression && currentImpression.relationshipValue ? currentImpression.relationshipValue : 0)
        + recentSummaries.reduce((total, summary) => total + (summary.relationshipDelta || 0), 0)
    );
    let nextImpression = {
        impression: buildFallbackImpression(npc, recentSummaries, currentImpression),
        relationshipValue: fallbackRelationship
    };

    try {
        const prompt = buildUpdatePersonaImpressionPrompt(npc, recentSummaries, currentImpression);
        const result = await ask('update_persona_impression', {
            npcId: npc.id,
            playerId: playerId,
            summaryCount: summaries.length
        }, {
            timeoutMs: settings.timeoutMs || 4000,
            useCache: false,
            prompt: prompt
        });
        const parsed = result && result.ok ? parsePersonaResponse(result.text) : null;
        if (parsed && parsed.impression) {
            nextImpression = parsed;
        }
    } catch (_error) {
        // Fallback impression is intentionally deterministic for offline demos.
    }

    memoryStore.upsertPersonaImpression({
        playerId: playerId,
        npcId: npc.id,
        impression: nextImpression.impression,
        evidenceEventIds: evidenceEventIds,
        relationshipValue: nextImpression.relationshipValue,
        updatedTs: settings.ts || Date.now()
    });

    return {
        skipped: false,
        npcId: npc.id,
        summaryCount: summaries.length,
        impression: nextImpression.impression,
        evidenceEventIds: evidenceEventIds,
        relationshipValue: nextImpression.relationshipValue
    };
}

async function updatePersonaImpressions(options) {
    const settings = options || {};
    const npcs = Array.isArray(settings.npcs) ? settings.npcs : [];
    const results = [];

    for (const npc of npcs) {
        results.push(await updateNpcPersona(Object.assign({}, settings, {
            npc: npc
        })));
    }

    return results;
}

module.exports = {
    clampRelationshipValue: clampRelationshipValue,
    collectEvidenceEventIds: collectEvidenceEventIds,
    parsePersonaResponse: parsePersonaResponse,
    shouldUpdateFromSummaryCount: shouldUpdateFromSummaryCount,
    updateNpcPersona: updateNpcPersona,
    updatePersonaImpressions: updatePersonaImpressions
};
