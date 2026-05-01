#!/usr/bin/env node
'use strict';

const report = require('../apps/server/src/balance/report');

function formatMs(value) {
    if (value === null || typeof value !== 'number') {
        return 'n/a';
    }
    return Math.round(value / 1000) + 's';
}

function formatPercent(value) {
    return Math.round((value || 0) * 100) + '%';
}

function formatPass(target) {
    return target && target.pass ? 'PASS' : 'CHECK';
}

function printSummary(summary) {
    console.log('Balance Rhythm Report');
    console.log('Files: ' + (summary.files || []).length + ' · Events: ' + (summary.eventCount || 0));
    if (!summary.presets.length) {
        console.log('No balance telemetry events found.');
        return;
    }

    summary.presets.forEach((preset) => {
        console.log('');
        console.log('[' + preset.preset + ']');
        console.log('snapshots=' + preset.snapshots
            + ' devours=' + preset.devourCount
            + ' settlements=' + preset.settlementCount);
        console.log('firstPart=' + formatMs(preset.firstPartPickupMs)
            + ' ' + formatPass(preset.targets.firstPartPickup)
            + ' · firstGhost=' + formatMs(preset.firstGhostMs)
            + ' ' + formatPass(preset.targets.firstGhost)
            + ' · bodyCompletion=' + formatPercent(preset.bodyCompletionRate)
            + ' ' + formatPass(preset.targets.bodyCompletionRate));
        console.log('maxPlayerMass=' + preset.maxPlayerMass);
        console.log('partsBySource=' + JSON.stringify(preset.partsBySource));
        console.log('settlementsByReason=' + JSON.stringify(preset.settlementsByReason));
    });
}

const targetPath = process.argv[2] || process.env.BALANCE_AUDIT_DIR;
printSummary(report.summarizePath(targetPath));
