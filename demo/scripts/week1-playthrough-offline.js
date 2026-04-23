#!/usr/bin/env node
'use strict';

const path = require('path');
const {runScenario} = require('./week1-playthrough-online');

async function executeOfflineScenario(driver, options, summary) {
    await driver.waitForReady(options.timeoutMs);
    await driver.sleep(4000);

    const signatures = [];
    const intervalMs = Math.max(1500, Math.floor(options.durationMs / 6));

    for (let index = 0; index < 6; index += 1) {
        signatures.push(await driver.canvasFingerprint());
        if (index < 5) {
            await driver.sleep(intervalMs);
        }
    }

    const chatLines = await driver.chatLines();
    const bodyText = await driver.bodyText();

    if (new Set(signatures).size < 2) {
        throw new Error('Expected visible movement while offline fallback was active.');
    }
    if (!chatLines.some((text) => text.includes('Mochi') || text.includes('Doudou') || text.includes('Wugui'))) {
        throw new Error('Expected at least one NPC fallback speak line while offline.');
    }
    if (bodyText.includes('Disconnected')) {
        throw new Error('Game disconnected during offline fallback scenario.');
    }

    summary.offlineChecks = {
        serverForcedOfflineLlm: true,
        gameDidNotCrash: true,
        fallbackSpeakExpected: true,
        uniqueCanvasSignatures: new Set(signatures).size,
        fallbackChatLines: chatLines.length
    };
}

async function main() {
    const summary = await runScenario({
        scriptName: 'week1-playthrough-offline.js',
        scenario: 'offline',
        session: 'w1-offline',
        url: 'http://127.0.0.1:35101',
        outputPath: path.resolve(__dirname, '..', 'videos/week1/offline.mp4'),
        ensureServer: true,
        auditDir: 'data/audit/week1/offline',
        serverCommand: 'PORT=35101 HOST=127.0.0.1 IP=127.0.0.1 LLM_PROVIDER=openai OPENAI_API_KEY=week1-offline-demo OPENAI_BASE_URL=http://127.0.0.1:9/v1 LLM_TIMEOUT_MS=50 LLM_AUDIT_DIR=data/audit/week1/offline node dist/server/server.js',
        serverEnv: {},
        settleDelayMs: 4000,
        executeScenario: executeOfflineScenario
    });

    if (!summary) {
        return;
    }

    summary.offlineChecks = Object.assign({}, summary.offlineChecks || {}, {
        serverForcedOfflineLlm: true,
        gameDidNotCrash: !summary.failure,
        fallbackSpeakExpected: true
    });

    console.log(JSON.stringify({
        scenario: summary.scenario,
        outputPath: summary.outputPath,
        video: summary.video,
        observedDurationMs: summary.observedDurationMs,
        auditWindow: summary.auditWindow,
        offlineChecks: summary.offlineChecks,
        failure: summary.failure || null
    }, null, 2));

    if (summary.failure) {
        process.exitCode = 1;
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error && error.stack ? error.stack : error);
        process.exit(1);
    });
}
