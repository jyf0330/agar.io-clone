'use strict';

const socketIoClient = require('socket.io-client');

const {BOT_STATES, FAILURE_REASONS} = require('./constants');
const {BotStateMachine} = require('./state-machine');
const {buildEntryPayload, selectBodyPart} = require('./body-selection');

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasPosition(playerData) {
    return playerData && typeof playerData.x === 'number' && typeof playerData.y === 'number';
}

function isTerminalState(state) {
    return state === BOT_STATES.Finished
        || state === BOT_STATES.Failed
        || state === BOT_STATES.Crashed
        || state === BOT_STATES.Timeout;
}

class SimulatedPlayerClient {
    constructor(options) {
        const settings = options || {};
        this.botId = settings.botId;
        this.roomId = settings.roomId || 'test-room-001';
        this.serverUrl = settings.serverUrl || 'http://127.0.0.1:3000';
        this.random = settings.random || Math.random;
        this.logger = settings.logger;
        this.ioFactory = settings.ioFactory || socketIoClient;
        this.movementIntervalMs = settings.movementIntervalMs || 250;
        this.heartbeatIntervalMs = settings.heartbeatIntervalMs || 1000;
        this.machine = settings.machine || new BotStateMachine({
            botId: this.botId,
            logger: this.logger,
            timeouts: settings.stateTimeouts
        });
        this.socket = null;
        this.player = null;
        this.game = null;
        this.visibleFood = [];
        this.syncCount = 0;
        this.settlement = null;
        this.movementTimer = null;
        this.heartbeatTimer = null;
        this.lastTarget = {x: 0, y: 0};
    }

    connect() {
        const startedAt = Date.now();
        this.machine.transition(BOT_STATES.Connecting, '连接服务器', '开始连接 ' + this.serverUrl);
        const socket = this.ioFactory(this.serverUrl, {
            query: {
                type: 'player'
            },
            reconnection: false
        });
        this.socket = socket;

        socket.on('connect', () => {
            this.machine.transition(BOT_STATES.Connected, '连接服务器', '成功，耗时 ' + (Date.now() - startedAt) + 'ms');
            this.machine.transition(BOT_STATES.EnteringLobby, '进入大厅', '发送 respawn 请求');
            socket.emit('respawn');
        });

        socket.on('connect_error', (error) => {
            this.machine.fail(FAILURE_REASONS.ConnectionFailed, BOT_STATES.Connecting, error && error.message ? error.message : '连接失败', {
                stack: error && error.stack ? error.stack : ''
            });
        });

        socket.on('welcome', (playerSettings, gameSizes) => {
            try {
                this.handleWelcome(playerSettings, gameSizes);
            } catch (error) {
                this.machine.fail(FAILURE_REASONS.BodySelectionFailed, BOT_STATES.SelectingBodyPart, error.message, {
                    stack: error.stack
                });
            }
        });

        socket.on('serverTellPlayerMove', (playerData, visiblePlayers, visibleFood, visibleMass, visibleViruses, visiblePartLoot, visibleGhosts) => {
            this.handleSync(playerData, visiblePlayers, visibleFood, visibleMass, visibleViruses, visiblePartLoot, visibleGhosts);
        });

        socket.on('settlement', (data) => {
            this.settlement = data || {};
            this.machine.transition(BOT_STATES.Settling, '进入结算', '收到 settlement', {
                endedReason: this.settlement.endedReason || ''
            });
            this.machine.transition(BOT_STATES.Finished, '结算完成', '测试结果已记录', {
                endedReason: this.settlement.endedReason || ''
            });
            this.stopMovement();
            this.stopHeartbeat();
        });

        socket.on('kick', (message) => {
            this.machine.fail(FAILURE_REASONS.ServerError, this.machine.state, '服务器踢出：' + (message || '无原因'));
            this.stopMovement();
            this.stopHeartbeat();
        });

        socket.on('disconnect', (reason) => {
            if (isTerminalState(this.machine.state)) {
                return;
            }
            const failureReason = this.machine.state === BOT_STATES.InBattle
                ? FAILURE_REASONS.BattleDisconnected
                : FAILURE_REASONS.ConnectionFailed;
            this.machine.fail(failureReason, this.machine.state, 'Socket 断开：' + (reason || '未知'));
            this.stopMovement();
            this.stopHeartbeat();
        });

        return socket;
    }

    handleWelcome(playerSettings, gameSizes) {
        this.game = gameSizes || {width: 5000, height: 5000};
        this.player = Object.assign({}, playerSettings || {}, {
            name: this.botId
        });
        this.lastTarget = this.player.target || this.lastTarget;
        this.machine.transition(BOT_STATES.RequestingStart, '请求开始游戏', '收到 welcome，准备提交 gotit', {
            width: this.game.width,
            height: this.game.height
        });
        this.machine.transition(BOT_STATES.SelectingBodyPart, '补全身体', '开始随机选择零件');
        const selection = selectBodyPart(this.random);
        this.machine.transition(BOT_STATES.ConfirmingBody, '补全身体', '选择零件=' + selection.choice.label + '，结果=成功', {
            partId: selection.choice.partId
        });
        const payload = buildEntryPayload({
            botId: this.botId,
            name: this.botId,
            random: this.random,
            selection,
            target: this.player.target || {x: 0, y: 0}
        });
        this.socket.emit('gotit', payload);
        this.machine.transition(BOT_STATES.WaitingForPlayers, '确认身体', 'gotit 已发送，等待房间倒计时');
        this.startHeartbeat();
    }

    handleSync(playerData, _visiblePlayers, visibleFood, _visibleMass, _visibleViruses, _visiblePartLoot, _visibleGhosts) {
        this.syncCount += 1;
        this.player = Object.assign({}, this.player || {}, playerData || {});
        if (this.player.target) {
            this.lastTarget = this.player.target;
        } else if (hasPosition(this.player)) {
            this.lastTarget = {
                x: this.player.x,
                y: this.player.y
            };
        }
        this.visibleFood = Array.isArray(visibleFood) ? visibleFood : [];
        if (this.machine.state === BOT_STATES.InBattle && !hasPosition(this.player)) {
            this.machine.fail(FAILURE_REASONS.PositionSyncAbnormal, BOT_STATES.InBattle, '位置同步失败，原因=服务器未返回坐标', {
                playerData: playerData || null
            });
            return;
        }
        if (this.machine.state === BOT_STATES.InBattle && this.syncCount === 1) {
            this.machine.transition(BOT_STATES.InBattle, '战斗同步', '收到第一帧同步', {
                x: this.player.x,
                y: this.player.y
            });
        }
    }

    markCountdown(seconds) {
        this.machine.transition(BOT_STATES.Countdown, '倒计时开始', seconds + ' 秒');
    }

    startBattle() {
        this.machine.transition(BOT_STATES.InBattle, '战斗开始', '进入战斗循环');
        this.stopMovement();
        this.movementTimer = setInterval(() => {
            this.tickBattle();
        }, this.movementIntervalMs);
    }

    startHeartbeat() {
        this.stopHeartbeat();
        this.tickHeartbeat();
        this.heartbeatTimer = setInterval(() => {
            this.tickHeartbeat();
        }, this.heartbeatIntervalMs);
    }

    tickHeartbeat() {
        if (!this.socket || isTerminalState(this.machine.state)) {
            return;
        }
        this.socket.emit('0', {
            x: this.lastTarget.x,
            y: this.lastTarget.y
        });
    }

    tickBattle() {
        if (!this.socket || this.machine.state !== BOT_STATES.InBattle) {
            return;
        }
        const width = this.game && this.game.width ? this.game.width : 5000;
        const height = this.game && this.game.height ? this.game.height : 5000;
        const foodTarget = this.visibleFood.length ? this.visibleFood[Math.floor(this.random() * this.visibleFood.length)] : null;
        const target = foodTarget || {
            x: Math.round(this.random() * width),
            y: Math.round(this.random() * height)
        };
        this.lastTarget = {
            x: target.x,
            y: target.y
        };
        this.socket.emit('0', this.lastTarget);
        if (this.random() > 0.92) {
            this.socket.emit('1');
        }
        if (this.random() > 0.97) {
            this.socket.emit('2');
        }
        if (this.random() > 0.98) {
            this.socket.emit('3');
        }
    }

    requestSettlement() {
        if (!this.socket || this.machine.state === BOT_STATES.Finished) {
            return;
        }
        this.machine.transition(BOT_STATES.Settling, '请求结算', '发送快速结算聊天命令');
        this.socket.emit('playerChat', {
            sender: this.botId,
            message: '快速结算'
        });
    }

    waitForStates(states, timeoutMs) {
        const expectedStates = Array.isArray(states) ? states : [states];
        const startedAt = Date.now();
        return new Promise((resolve) => {
            const timer = setInterval(() => {
                this.machine.checkTimeout();
                if (expectedStates.indexOf(this.machine.state) > -1 || this.machine.failure) {
                    clearInterval(timer);
                    resolve(this.machine.state);
                    return;
                }
                if (Date.now() - startedAt >= timeoutMs) {
                    clearInterval(timer);
                    resolve(this.machine.state);
                }
            }, 50);
        });
    }

    async waitForFinished(timeoutMs) {
        await wait(0);
        return this.waitForStates([BOT_STATES.Finished, BOT_STATES.Failed, BOT_STATES.Timeout, BOT_STATES.Crashed], timeoutMs);
    }

    stopMovement() {
        if (this.movementTimer) {
            clearInterval(this.movementTimer);
            this.movementTimer = null;
        }
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    stop() {
        this.stopMovement();
        this.stopHeartbeat();
        if (this.socket && typeof this.socket.disconnect === 'function') {
            this.socket.disconnect();
        }
    }

    toResult() {
        return this.machine.toResult();
    }
}

module.exports = {
    SimulatedPlayerClient,
    wait
};
