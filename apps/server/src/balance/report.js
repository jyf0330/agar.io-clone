'use strict';

const fs = require('fs');
const path = require('path');

const TARGETS = {
    demo: {
        firstPartPickupMs: {min: 30000, max: 60000},
        firstGhostMs: {min: 60000, max: 120000},
        bodyCompletionRate: {min: 0.2, max: 0.4}
    },
    standard: {
        firstPartPickupMs: {min: 60000, max: 120000},
        firstGhostMs: {min: 120000, max: 240000},
        bodyCompletionRate: {min: 0.1, max: 0.25}
    },
    long: {
        firstPartPickupMs: {min: 120000, max: 300000},
        firstGhostMs: {min: 180000, max: 420000},
        bodyCompletionRate: {min: 0.05, max: 0.2}
    }
};

function createEmptyPreset(preset) {
    return {
        preset,
        snapshots: 0,
        firstPartPickupMs: null,
        firstGhostMs: null,
        devourCount: 0,
        settlementCount: 0,
        bodyCompletionCount: 0,
        bodyCompletionRate: 0,
        maxPlayerMass: 0,
        partsBySource: {},
        settlementsByReason: {},
        targets: {}
    };
}

function getPreset(summary, preset) {
    const key = preset || 'standard';
    if (!summary.byPreset[key]) {
        summary.byPreset[key] = createEmptyPreset(key);
    }
    return summary.byPreset[key];
}

function getPartSource(event) {
    return event.sourceType || event.lootSource || 'unknown';
}

function rememberFirst(current, next) {
    if (typeof next !== 'number') {
        return current;
    }
    if (current === null || next < current) {
        return next;
    }
    return current;
}

function evaluateRange(value, range) {
    if (value === null || typeof value !== 'number') {
        return {
            pass: false,
            value,
            min: range.min,
            max: range.max
        };
    }

    return {
        pass: value >= range.min && value <= range.max,
        value,
        min: range.min,
        max: range.max
    };
}

function evaluatePreset(preset) {
    const targets = TARGETS[preset.preset] || TARGETS.standard;
    preset.bodyCompletionRate = preset.settlementCount > 0
        ? preset.bodyCompletionCount / preset.settlementCount
        : 0;
    preset.targets = {
        firstPartPickup: evaluateRange(preset.firstPartPickupMs, targets.firstPartPickupMs),
        firstGhost: evaluateRange(preset.firstGhostMs, targets.firstGhostMs),
        bodyCompletionRate: evaluateRange(preset.bodyCompletionRate, targets.bodyCompletionRate)
    };
    return preset;
}

function summarizeEvents(events) {
    const summary = {
        byPreset: {},
        presets: []
    };
    const latestElapsedByPreset = {};

    (events || []).forEach((event) => {
        if (!event || !event.eventType) {
            return;
        }

        const preset = getPreset(summary, event.balancePreset);
        if (event.eventType === 'balance_world_snapshot') {
            preset.snapshots += 1;
            latestElapsedByPreset[preset.preset] = typeof event.elapsedMs === 'number' ? event.elapsedMs : latestElapsedByPreset[preset.preset];
            if ((event.ghostCount || 0) > 0) {
                preset.firstGhostMs = rememberFirst(preset.firstGhostMs, event.elapsedMs);
            }
            (event.players || []).forEach((player) => {
                preset.maxPlayerMass = Math.max(preset.maxPlayerMass, player.massTotal || 0);
            });
            return;
        }

        if (event.eventType === 'balance_part_pickup') {
            const source = getPartSource(event);
            preset.partsBySource[source] = (preset.partsBySource[source] || 0) + 1;
            preset.firstPartPickupMs = rememberFirst(preset.firstPartPickupMs, latestElapsedByPreset[preset.preset]);
            return;
        }

        if (event.eventType === 'balance_player_devour') {
            preset.devourCount += 1;
            return;
        }

        if (event.eventType === 'balance_round_settlement') {
            preset.settlementCount += 1;
            preset.settlementsByReason[event.endedReason || 'unknown'] = (preset.settlementsByReason[event.endedReason || 'unknown'] || 0) + 1;
            if (event.endedReason === 'body_complete') {
                preset.bodyCompletionCount += 1;
            }
        }
    });

    summary.presets = Object.keys(summary.byPreset).sort().map((preset) => {
        return evaluatePreset(summary.byPreset[preset]);
    });
    return summary;
}

function readJsonlFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return [];
    }
    return fs.readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line));
}

function listJsonlFiles(targetPath) {
    const resolved = path.resolve(targetPath || path.join(process.cwd(), 'data/balance'));
    if (!fs.existsSync(resolved)) {
        return [];
    }
    const stat = fs.statSync(resolved);
    if (stat.isFile()) {
        return [resolved];
    }
    return fs.readdirSync(resolved)
        .filter((name) => name.endsWith('.jsonl'))
        .sort()
        .map((name) => path.join(resolved, name));
}

function summarizePath(targetPath) {
    const files = listJsonlFiles(targetPath);
    const events = files.reduce((allEvents, filePath) => {
        return allEvents.concat(readJsonlFile(filePath));
    }, []);
    const summary = summarizeEvents(events);
    summary.files = files;
    summary.eventCount = events.length;
    return summary;
}

module.exports = {
    TARGETS,
    listJsonlFiles,
    readJsonlFile,
    summarizeEvents,
    summarizePath
};
