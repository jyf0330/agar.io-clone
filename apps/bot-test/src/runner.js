'use strict';

const path = require('path');

const {BotTestLogger} = require('./logger');
const {SimulatedPlayerClient, wait} = require('./simulated-player-client');
const {createSeededRandom} = require('./random');
const {buildStateTimeouts, DEFAULT_CONFIG} = require('./config');
const {BOT_STATES, FAILURE_REASONS} = require('./constants');
const {writeSummary} = require('./report-generator');

function pad(value) {
    return String(value).padStart(2, '0');
}

function buildBotId(index) {
    return 'Bot_' + pad(index + 1);
}

function isFinished(client) {
    const result = client.toResult();
    return result.state === BOT_STATES.Finished;
}

function failUnfinished(client, reason, stage, message) {
    if (!client || isFinished(client)) {
        return;
    }
    if (client.machine && typeof client.machine.fail === 'function') {
        client.machine.fail(reason, stage || client.machine.state, message || reason);
    }
}

async function runBotTest(options) {
    const settings = Object.assign({}, DEFAULT_CONFIG, options || {});
    settings.timeouts = Object.assign({}, DEFAULT_CONFIG.timeouts, (options && options.timeouts) || {});

    const logger = settings.logger || new BotTestLogger({
        rootDir: path.resolve(process.cwd(), settings.logDir || DEFAULT_CONFIG.logDir),
        sessionName: settings.sessionName,
        roomId: settings.roomId
    });
    const random = createSeededRandom(settings.seed);
    const ClientCtor = settings.clientFactory || ((clientOptions) => new SimulatedPlayerClient(clientOptions));
    const stateTimeouts = buildStateTimeouts(settings);
    const clients = [];

    logger.room({
        type: '测试房间创建',
        message: '使用共享服务器房间，roomId=' + settings.roomId,
        data: {
            serverUrl: settings.serverUrl,
            botCount: settings.botCount
        }
    });

    for (let index = 0; index < settings.botCount; index += 1) {
        const botId = buildBotId(index);
        const client = ClientCtor({
            botId,
            roomId: settings.roomId,
            serverUrl: settings.serverUrl,
            random,
            logger,
            stateTimeouts
        });
        clients.push(client);
        logger.room({
            type: '玩家加入',
            message: botId + ' 加入测试房间',
            data: {botId}
        });
        client.connect();
    }

    await Promise.all(clients.map((client) => {
        const connectMs = settings.timeouts.connectTimeoutSeconds * 1000
            + settings.timeouts.bodySelectTimeoutSeconds * 1000
            + 1000;
        return client.waitForStates(BOT_STATES.WaitingForPlayers, connectMs);
    }));

    const joinFailures = clients.filter((client) => {
        const result = client.toResult();
        return result.state !== BOT_STATES.WaitingForPlayers && result.state !== BOT_STATES.Finished;
    });
    joinFailures.forEach((client) => {
        failUnfinished(client, FAILURE_REASONS.JoinRoomFailed, client.toResult().state, '未能进入等待房间阶段');
    });

    if (!joinFailures.length) {
        logger.room({
            type: '准备完成',
            message: '所有 Bot 已提交 gotit 并进入等待阶段',
            data: {players: clients.length}
        });
    }

    logger.room({
        type: '倒计时开始',
        message: settings.countdownSeconds + ' 秒',
        data: {seconds: settings.countdownSeconds}
    });
    clients.forEach((client) => {
        if (client.toResult().state === BOT_STATES.WaitingForPlayers && typeof client.markCountdown === 'function') {
            client.markCountdown(settings.countdownSeconds);
        }
    });
    if (settings.countdownSeconds > 0) {
        await wait(settings.countdownSeconds * 1000);
    }

    logger.room({
        type: '战斗开始',
        message: '玩家数=' + clients.length,
        data: {players: clients.length}
    });
    clients.forEach((client) => {
        const state = client.toResult().state;
        if (state === BOT_STATES.Countdown || state === BOT_STATES.WaitingForPlayers) {
            client.startBattle();
        }
    });

    await wait(settings.durationSeconds * 1000);
    logger.room({
        type: '对局结束',
        message: '原因=测试时长结束，开始请求结算',
        data: {durationSeconds: settings.durationSeconds}
    });

    clients.forEach((client) => {
        if (!isFinished(client) && typeof client.requestSettlement === 'function') {
            client.requestSettlement();
        }
    });

    await Promise.all(clients.map((client) => client.waitForFinished(settings.timeouts.settlementTimeoutSeconds * 1000)));

    clients.forEach((client) => {
        const result = client.toResult();
        if (result.state !== BOT_STATES.Finished) {
            failUnfinished(client, FAILURE_REASONS.SettlementFailed, result.state, '结算失败：未收到 settlement/RIP 完整流程');
        }
    });

    clients.forEach((client) => {
        if (typeof client.stop === 'function') {
            client.stop();
        }
    });

    const bots = clients.map((client) => client.toResult());
    const completedSettlement = bots.length > 0 && bots.every((bot) => bot.state === BOT_STATES.Finished);
    const result = {
        roomId: settings.roomId,
        completedSettlement,
        bots,
        sessionDir: logger.sessionDir,
        roomNotes: [
            '当前正式游戏没有独立房间/匹配接口，本测试房间是测试运行器的逻辑房间。',
            'Bot 使用真实 Socket.IO 玩家入口：connect(type=player) -> respawn -> welcome -> gotit -> serverTellPlayerMove。'
        ]
    };

    writeSummary(logger.sessionDir, result);
    return result;
}

module.exports = {
    buildBotId,
    runBotTest
};
