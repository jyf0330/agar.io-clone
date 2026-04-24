'use strict';

function hasSummaryEvidence(summary) {
    return Boolean(summary && Array.isArray(summary.referencedL1EventIds) && summary.referencedL1EventIds.length);
}

function buildReturnMemoryLine(summary) {
    if (!hasSummaryEvidence(summary)) {
        return null;
    }

    return ('你又来了，上局' + String(summary.summary || '').slice(0, 18)).slice(0, 28);
}

module.exports = {
    buildReturnMemoryLine: buildReturnMemoryLine,
    hasSummaryEvidence: hasSummaryEvidence
};
