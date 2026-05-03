'use strict';

const DEFAULT_CONFIG = {
    botCount: 6,
    roomId: 'test-room-001',
    durationSeconds: 300,
    countdownSeconds: 5,
    behaviorValidationSeconds: 120,
    logDir: 'logs/bot-test',
    seed: Date.now(),
    serverUrl: process.env.BOT_TEST_SERVER_URL || 'http://127.0.0.1:3000',
    timeouts: {
        connectTimeoutSeconds: 10,
        bodySelectTimeoutSeconds: 5,
        countdownTimeoutSeconds: 15,
        battleStartTimeoutSeconds: 15,
        matchEndTimeoutSeconds: 330,
        settlementTimeoutSeconds: 20
    }
};

const OPTION_MAP = {
    bots: 'botCount',
    room: 'roomId',
    duration: 'durationSeconds',
    countdown: 'countdownSeconds',
    behaviorValidationSeconds: 'behaviorValidationSeconds',
    logDir: 'logDir',
    seed: 'seed',
    serverUrl: 'serverUrl',
    connectTimeoutSeconds: 'connectTimeoutSeconds',
    bodySelectTimeoutSeconds: 'bodySelectTimeoutSeconds',
    countdownTimeoutSeconds: 'countdownTimeoutSeconds',
    battleStartTimeoutSeconds: 'battleStartTimeoutSeconds',
    matchEndTimeoutSeconds: 'matchEndTimeoutSeconds',
    settlementTimeoutSeconds: 'settlementTimeoutSeconds'
};

function parseNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBotTestArgs(argv) {
    const args = Array.isArray(argv) ? argv : process.argv.slice(2);
    const config = {
        botCount: DEFAULT_CONFIG.botCount,
        roomId: DEFAULT_CONFIG.roomId,
        durationSeconds: DEFAULT_CONFIG.durationSeconds,
        countdownSeconds: DEFAULT_CONFIG.countdownSeconds,
        behaviorValidationSeconds: DEFAULT_CONFIG.behaviorValidationSeconds,
        logDir: DEFAULT_CONFIG.logDir,
        seed: DEFAULT_CONFIG.seed,
        serverUrl: DEFAULT_CONFIG.serverUrl,
        timeouts: Object.assign({}, DEFAULT_CONFIG.timeouts)
    };

    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (!arg || arg.indexOf('--') !== 0) {
            continue;
        }
        const key = arg.slice(2);
        const mappedKey = OPTION_MAP[key];
        if (!mappedKey) {
            continue;
        }
        const nextValue = args[index + 1];
        index += 1;

        if (Object.prototype.hasOwnProperty.call(config.timeouts, mappedKey)) {
            config.timeouts[mappedKey] = parseNumber(nextValue, config.timeouts[mappedKey]);
        } else if (mappedKey === 'botCount' || mappedKey === 'durationSeconds' || mappedKey === 'countdownSeconds' || mappedKey === 'behaviorValidationSeconds' || mappedKey === 'seed') {
            config[mappedKey] = parseNumber(nextValue, config[mappedKey]);
        } else {
            config[mappedKey] = nextValue;
        }
    }

    config.botCount = Math.max(1, Math.floor(config.botCount));
    config.durationSeconds = Math.max(1, config.durationSeconds);
    config.countdownSeconds = Math.max(0, config.countdownSeconds);
    config.behaviorValidationSeconds = Math.max(DEFAULT_CONFIG.behaviorValidationSeconds, config.behaviorValidationSeconds);
    return config;
}

function buildStateTimeouts(config) {
    const timeouts = config && config.timeouts ? config.timeouts : DEFAULT_CONFIG.timeouts;
    return {
        Connecting: timeouts.connectTimeoutSeconds * 1000,
        SelectingBodyPart: timeouts.bodySelectTimeoutSeconds * 1000,
        ConfirmingBody: timeouts.bodySelectTimeoutSeconds * 1000,
        Countdown: timeouts.countdownTimeoutSeconds * 1000,
        InBattle: timeouts.matchEndTimeoutSeconds * 1000,
        Settling: timeouts.settlementTimeoutSeconds * 1000
    };
}

module.exports = {
    DEFAULT_CONFIG,
    parseBotTestArgs,
    buildStateTimeouts
};
