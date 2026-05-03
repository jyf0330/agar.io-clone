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
    failClient(client, reason, stage, message);
}

function failClient(client, reason, stage, message) {
    if (!client) {
        return;
    }
    if (client.machine && typeof client.machine.fail === 'function') {
        client.machine.fail(reason, stage || client.machine.state, message || reason);
    } else if (Object.prototype.hasOwnProperty.call(client, 'state')) {
        client.state = BOT_STATES.Failed;
        client.failure = {
            reason,
            stage,
            message: message || reason
        };
    }
}

function hasEvent(events, predicate) {
    return (events || []).some((event) => event && predicate(event));
}

function getTimelineMissingEvents(events) {
    const checks = [
        {
            label: '进入房间',
            match: (event) => event.type === '玩家加入'
        },
        {
            label: 'connect(type=player)',
            match: (event) => event.type === '连接服务器'
                && event.data && event.data.socketType === 'player'
        },
        {
            label: 'respawn',
            match: (event) => event.type === '进入大厅'
                && String(event.message || '').indexOf('respawn') > -1
        },
        {
            label: 'welcome',
            match: (event) => event.type === '请求开始游戏'
                && String(event.message || '').indexOf('welcome') > -1
        },
        {
            label: '身体选择',
            match: (event) => event.type === '补全身体'
        },
        {
            label: 'gotit',
            match: (event) => event.type === '确认身体'
        },
        {
            label: '倒计时',
            match: (event) => event.type === '倒计时开始'
        },
        {
            label: '战斗开始',
            match: (event) => event.type === '战斗开始'
        },
        {
            label: '食物/资源目标',
            match: (event) => event.type === '战斗行为' && event.data && event.data.targetSource === '可见食物'
        },
        {
            label: '随机巡航',
            match: (event) => event.type === '战斗行为' && event.data && event.data.targetSource === '随机巡航'
        },
        {
            label: '避让大玩家',
            match: (event) => event.type === '战斗行为' && event.data && event.data.targetSource === '避让大玩家'
        },
        {
            label: '追击小玩家',
            match: (event) => event.type === '战斗行为' && event.data && event.data.targetSource === '追击小玩家'
        },
        {
            label: 'part loot',
            match: (event) => event.type === '战斗行为' && event.data && event.data.targetSource === 'part loot'
        },
        {
            label: 'ghost 出现/遭遇',
            match: (event) => event.type === 'ghost 出现/遭遇'
        },
        {
            label: '吐孢子',
            match: (event) => event.type === '战斗技能' && String(event.message || '').indexOf('吐孢子') > -1
        },
        {
            label: '分裂',
            match: (event) => event.type === '战斗技能' && String(event.message || '').indexOf('分裂') > -1
        },
        {
            label: '连接尝试',
            match: (event) => event.type === '战斗技能' && String(event.message || '').indexOf('连接') > -1
        },
        {
            label: '局内聊天',
            match: (event) => event.type === '局内聊天'
        },
        {
            label: 'devour',
            match: (event) => event.type === 'devour'
        },
        {
            label: '被 devour',
            match: (event) => event.type === '被 devour'
        },
        {
            label: 'body part pickup',
            match: (event) => event.type === 'body part pickup'
        },
        {
            label: 'body complete',
            match: (event) => event.type === 'body complete'
        },
        {
            label: 'settlement / endedReason',
            match: (event) => (event.type === '进入结算' || event.type === '结算完成')
                && event.data && event.data.endedReason
        }
    ];

    return checks.filter((check) => !hasEvent(events, check.match)).map((check) => check.label);
}

function getEndedReasons(clients) {
    const reasons = [];
    clients.forEach((client) => {
        const result = client.toResult();
        const event = result && result.lastSuccessEvent;
        const endedReason = event && event.data && event.data.endedReason;
        if (endedReason && reasons.indexOf(endedReason) === -1) {
            reasons.push(endedReason);
        }
    });
    return reasons;
}

function buildResult(settings, logger, clients, completedSettlement) {
    const bots = clients.map((client) => client.toResult());
    return {
        roomId: settings.roomId,
        completedSettlement,
        bots,
        sessionDir: logger.sessionDir,
        roomNotes: [
            '当前正式游戏没有独立房间/匹配接口，本测试房间是测试运行器的逻辑房间。',
            'Bot 使用真实 Socket.IO 玩家入口：connect(type=player) -> respawn -> welcome -> gotit -> serverTellPlayerMove。',
            '战斗阶段会记录移动目标、可见资源/玩家数量，以及吐孢子、分裂、连接尝试等玩家行为。',
            'Runner 不主动发送快速结算；只等待服务端 settlement，matchEndTimeoutSeconds 仅作兜底。'
        ]
    };
}

function stopClients(clients) {
    clients.forEach((client) => {
        if (typeof client.stop === 'function') {
            client.stop();
        }
    });
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

    if (joinFailures.length) {
        stopClients(clients);
        const joinFailureResult = buildResult(settings, logger, clients, false);
        writeSummary(logger.sessionDir, joinFailureResult);
        return joinFailureResult;
    }

    logger.room({
        type: '准备完成',
        message: '所有 Bot 已提交 gotit 并进入等待阶段',
        data: {players: clients.length}
    });

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

    const matchEndMs = settings.timeouts.matchEndTimeoutSeconds * 1000;
    const settlementMs = settings.timeouts.settlementTimeoutSeconds * 1000;
    await Promise.all(clients.map((client) => client.waitForFinished(matchEndMs + settlementMs)));

    clients.forEach((client) => {
        const result = client.toResult();
        if (result.state !== BOT_STATES.Finished) {
            failUnfinished(client, FAILURE_REASONS.Timeout, result.state, 'matchEndTimeoutSeconds 内未收到服务端 settlement / 游戏结束事件');
        }
    });

    const endedReasons = getEndedReasons(clients);
    logger.room({
        type: '对局结束',
        message: '收到服务端 settlement / 游戏结束事件',
        data: {
            endedReason: endedReasons.join(',') || ''
        }
    });

    const missingTimelineEvents = getTimelineMissingEvents(logger.events);
    if (missingTimelineEvents.length) {
        logger.room({
            type: '关键事件缺失',
            message: 'summary.md/raw_events.jsonl 缺少关键事件：' + missingTimelineEvents.join('、'),
            level: 'error',
            data: {
                missing: missingTimelineEvents
            }
        });
        clients.forEach((client) => {
            failClient(client, FAILURE_REASONS.SettlementFailed, client.toResult().state, '关键事件缺失：' + missingTimelineEvents.join('、'));
        });
    }

    stopClients(clients);

    const completedSettlement = clients.length > 0 && clients.every((client) => client.toResult().state === BOT_STATES.Finished);
    const result = buildResult(settings, logger, clients, completedSettlement);

    writeSummary(logger.sessionDir, result);
    return result;
}

module.exports = {
    buildBotId,
    runBotTest
};
