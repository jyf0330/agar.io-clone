#!/usr/bin/env node
'use strict';

const path = require('path');
const {runScenario} = require('./week1-playthrough-online');

function toNumber(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
}

function buildChatMessages(durationMs) {
    const defaults = [
        {at: 10000, text: '你喜欢什么颜色'},
        {at: 25000, text: '你能走过来吗'},
        {at: 40000, text: '今天天气真好'}
    ];
    const overrides = [
        process.env.W1_CHAT_AT_1_MS,
        process.env.W1_CHAT_AT_2_MS,
        process.env.W1_CHAT_AT_3_MS
    ];

    return defaults
        .map((entry, index) => ({
            at: toNumber(overrides[index], entry.at),
            text: entry.text
        }))
        .filter((entry) => entry.at < Math.max(1000, durationMs - 1000))
        .sort((left, right) => left.at - right.at);
}

async function executeChatScenario(driver, options, summary) {
    await driver.waitForReady(options.timeoutMs);
    await driver.waitForSelector('.npc-chat-field', options.timeoutMs);
    await driver.sleep(1000);

    const messages = buildChatMessages(options.durationMs);
    let elapsedMs = 0;
    for (const message of messages) {
        const gapMs = Math.max(0, message.at - elapsedMs);
        if (gapMs > 0) {
            await driver.sleep(gapMs);
        }
        await driver.fill('.npc-chat-field', message.text);
        await driver.press('Enter');
        elapsedMs = message.at;
    }

    const remainingMs = Math.max(1500, options.durationMs - elapsedMs);
    await driver.sleep(remainingMs);

    const historyItems = await driver.chatHistory();
    const chatLines = await driver.chatLines();

    messages.forEach((message) => {
        if (!historyItems.some((text) => String(text).includes(message.text))) {
            throw new Error('Expected scripted local chat history to include: ' + message.text);
        }
    });

    ['Mochi', 'Doudou', 'Wugui'].forEach((npcName) => {
        if (!chatLines.some((text) => String(text).includes(npcName))) {
            throw new Error('Expected ' + npcName + ' to speak during the chat playthrough.');
        }
    });

    summary.chatChecks = {
        sentMessages: messages,
        localHistoryCount: historyItems.length,
        npcLineCount: chatLines.length
    };
}

async function main() {
    const summary = await runScenario({
        scriptName: 'week1-playthrough-chat.js',
        scenario: 'chat',
        session: 'w1-chat',
        url: 'http://127.0.0.1:35102',
        outputPath: path.resolve(__dirname, '..', 'videos/week1/chat.mp4'),
        ensureServer: true,
        auditDir: 'data/audit/week1/chat',
        serverCommand: 'PORT=35102 HOST=127.0.0.1 IP=127.0.0.1 LLM_PROVIDER=mock LLM_AUDIT_DIR=data/audit/week1/chat node dist/server/server.js',
        serverEnv: {},
        executeScenario: executeChatScenario
    });

    if (!summary) {
        return;
    }

    console.log(JSON.stringify({
        scenario: summary.scenario,
        outputPath: summary.outputPath,
        video: summary.video,
        observedDurationMs: summary.observedDurationMs,
        auditWindow: summary.auditWindow,
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
