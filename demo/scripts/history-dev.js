#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const store = require('../../apps/server/src/memory/store');

function printUsage() {
    console.log([
        'Usage: node demo/scripts/history-dev.js <command> [args]',
        '',
        'Commands:',
        '  clear',
        '  list [limit]',
        '  mark-seed <sessionId> [playerId]',
        '  export <sessionId> [output.json]',
        '  load-seed <input.json>'
    ].join('\n'));
}

function writeJson(payload, outputPath) {
    const text = JSON.stringify(payload, null, 2);
    if (!outputPath) {
        console.log(text);
        return;
    }

    fs.mkdirSync(path.dirname(path.resolve(outputPath)), {recursive: true});
    fs.writeFileSync(outputPath, text + '\n', 'utf8');
    console.log('wrote ' + outputPath);
}

function exportSession(sessionId) {
    return {
        version: 1,
        exportedAt: Date.now(),
        sessionId: sessionId,
        sessions: store.listSessions({sessionId: sessionId, limit: 1000}),
        playerTraces: store.listPlayerTraces({sessionId: sessionId, limit: 1000}),
        chatRecords: store.listChatRecords({sessionId: sessionId, limit: 1000}),
        itemEvents: store.listItemEvents({sessionId: sessionId, limit: 1000}),
        partEvents: store.listPartEvents({sessionId: sessionId, limit: 1000}),
        combatEvents: store.listCombatEvents({sessionId: sessionId, limit: 1000}),
        ghostAnchors: store.listGhostAnchors({sourceSessionId: sessionId, limit: 1000}),
        events: store.listEvents({sessionId: sessionId, limit: 1000})
    };
}

function loadSeed(filePath) {
    const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    (payload.sessions || []).forEach((session) => {
        store.recordSession(Object.assign({}, session, {
            isSeed: true,
            isReplayAllowed: true
        }));
    });
    (payload.playerTraces || []).forEach(store.recordPlayerTrace);
    (payload.chatRecords || []).forEach(store.recordChatRecord);
    (payload.itemEvents || []).forEach(store.recordItemEvent);
    (payload.partEvents || []).forEach(store.recordPartEvent);
    (payload.combatEvents || []).forEach(store.recordCombatEvent);
    (payload.ghostAnchors || []).forEach(store.recordGhostAnchor);
    (payload.events || []).forEach(store.recordEvent);

    console.log('loaded seed session ' + (payload.sessionId || filePath));
}

function main(argv) {
    const command = argv[2];

    if (command === 'clear') {
        store.clearHistoricalEchoData();
        console.log('cleared historical echo data');
        return;
    }

    if (command === 'list') {
        const limit = Number(argv[3]) || 50;
        writeJson(store.listSessions({limit: limit}));
        return;
    }

    if (command === 'mark-seed') {
        if (!argv[3]) {
            printUsage();
            process.exitCode = 1;
            return;
        }
        store.markSeedSession(argv[3], argv[4], true);
        console.log('marked seed session ' + argv[3]);
        return;
    }

    if (command === 'export') {
        if (!argv[3]) {
            printUsage();
            process.exitCode = 1;
            return;
        }
        writeJson(exportSession(argv[3]), argv[4]);
        return;
    }

    if (command === 'load-seed') {
        if (!argv[3]) {
            printUsage();
            process.exitCode = 1;
            return;
        }
        loadSeed(argv[3]);
        return;
    }

    printUsage();
    process.exitCode = command ? 1 : 0;
}

main(process.argv);
