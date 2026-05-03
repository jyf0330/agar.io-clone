'use strict';

const socketIoClient = require('socket.io-client');

const {BOT_STATES, FAILURE_REASONS} = require('./constants');
const {BotStateMachine} = require('./state-machine');
const {buildEntryPayload, selectBodyPart} = require('./body-selection');

const COMPLETION_PART_TYPES = ['HEAD', 'HAND', 'FOOT', 'MOUTH', 'HEART'];

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasPosition(playerData) {
    return playerData && typeof playerData.x === 'number' && typeof playerData.y === 'number';
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isTerminalState(state) {
    return state === BOT_STATES.Finished
        || state === BOT_STATES.Failed
        || state === BOT_STATES.Crashed
        || state === BOT_STATES.Timeout;
}

function getPartType(part) {
    return part && (part.partType || part.type || '').toUpperCase();
}

function getMassTotal(player) {
    if (player && typeof player.massTotal === 'number') {
        return player.massTotal;
    }
    if (player && typeof player.mass === 'number') {
        return player.mass;
    }
    return null;
}

class SimulatedPlayerClient {
    constructor(options) {
        const settings = options || {};
        this.botId = settings.botId;
        this.roomId = settings.roomId || 'test-room-001';
        this.serverUrl = settings.serverUrl || 'http://127.0.0.1:3000';
        this.random = settings.random || Math.random;
        this.now = settings.now || Date.now;
        this.logger = settings.logger;
        this.ioFactory = settings.ioFactory || socketIoClient;
        this.movementIntervalMs = settings.movementIntervalMs || 250;
        this.heartbeatIntervalMs = settings.heartbeatIntervalMs || 1000;
        this.skillCooldownMs = settings.skillCooldownMs || 4000;
        this.behaviorLogEveryTicks = settings.behaviorLogEveryTicks || Math.max(1, Math.round(5000 / this.movementIntervalMs));
        this.machine = settings.machine || new BotStateMachine({
            botId: this.botId,
            logger: this.logger,
            timeouts: settings.stateTimeouts
        });
        this.socket = null;
        this.player = null;
        this.game = null;
        this.visibleFood = [];
        this.visiblePlayers = [];
        this.visibleMass = [];
        this.visibleViruses = [];
        this.visiblePartLoot = [];
        this.visibleGhosts = [];
        this.syncCount = 0;
        this.battleTickCount = 0;
        this.behaviorStats = {
            bodySelectionEvents: 0,
            syncEvents: 0,
            movementEvents: 0,
            resourceTargetEvents: 0,
            randomCruiseEvents: 0,
            skillEvents: 0,
            ejectMassEvents: 0,
            splitEvents: 0,
            connectionAttemptEvents: 0,
            avoidanceEvents: 0,
            pursuitEvents: 0,
            partLootTargetEvents: 0,
            ghostEncounterEvents: 0,
            bodyPartPickupEvents: 0,
            bodyCompleteEvents: 0,
            devourEvents: 0,
            devouredEvents: 0,
            settlementEvents: 0,
            chatEvents: 0
        };
        this.settlement = null;
        this.movementTimer = null;
        this.heartbeatTimer = null;
        this.lastTarget = {x: 0, y: 0};
        this.lastInputTarget = {x: 0, y: 0};
        this.battleStartedAtMs = 0;
        this.lastSkillAtMs = 0;
        this.lastMassTotal = null;
        this.lastBodyPartCount = null;
        this.seenBodyHistoryEvents = {};
        this.bodyCompleteLogged = false;
    }

    connect() {
        const startedAt = Date.now();
        this.machine.transition(BOT_STATES.Connecting, '连接服务器', '开始连接 ' + this.serverUrl, {
            socketType: 'player'
        });
        const socket = this.ioFactory(this.serverUrl, {
            query: {
                type: 'player'
            },
            reconnection: false
        });
        this.socket = socket;

        socket.on('connect', () => {
            this.machine.transition(BOT_STATES.Connected, '连接服务器', '成功，耗时 ' + (Date.now() - startedAt) + 'ms', {
                socketType: 'player'
            });
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

        socket.on('playerMetaUpdate', (playersMeta) => {
            this.handlePlayerMetaUpdate(playersMeta);
        });

        socket.on('settlement', (data) => {
            this.settlement = data || {};
            this.recordSettlementKeyEvents(this.settlement);
            this.machine.transition(BOT_STATES.Settling, '进入结算', '收到 settlement', {
                endedReason: this.settlement.endedReason || ''
            });
            this.behaviorStats.settlementEvents += 1;
            this.machine.transition(BOT_STATES.Finished, '结算完成', '测试结果已记录', {
                endedReason: this.settlement.endedReason || ''
            });
            this.stopMovement();
            this.stopHeartbeat();
        });

        socket.on('RIP', () => {
            this.logBehavior('对局结束', '收到 RIP / 游戏结束事件', {
                endedReason: this.settlement && this.settlement.endedReason || ''
            });
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
        if (this.player.target) {
            this.lastInputTarget = this.normalizeInputTarget(this.player.target);
            this.lastTarget = this.resolveWorldTargetFromInput(this.lastInputTarget);
        }
        this.lastMassTotal = getMassTotal(this.player);
        this.machine.transition(BOT_STATES.RequestingStart, '请求开始游戏', '收到 welcome，准备提交 gotit', {
            width: this.game.width,
            height: this.game.height
        });
        this.machine.transition(BOT_STATES.SelectingBodyPart, '补全身体', '开始随机选择零件');
        const selection = selectBodyPart(this.random);
        this.behaviorStats.bodySelectionEvents += 1;
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
        const previousMassTotal = this.lastMassTotal;
        this.syncCount += 1;
        this.behaviorStats.syncEvents += 1;
        this.player = Object.assign({}, this.player || {}, playerData || {});
        if (this.player.target) {
            this.lastInputTarget = this.normalizeInputTarget(this.player.target);
            this.lastTarget = this.resolveWorldTargetFromInput(this.lastInputTarget);
        } else if (hasPosition(this.player)) {
            this.lastTarget = {
                x: this.player.x,
                y: this.player.y
            };
        }
        this.visiblePlayers = Array.isArray(_visiblePlayers) ? _visiblePlayers : [];
        this.visibleFood = Array.isArray(visibleFood) ? visibleFood : [];
        this.visibleMass = Array.isArray(_visibleMass) ? _visibleMass : [];
        this.visibleViruses = Array.isArray(_visibleViruses) ? _visibleViruses : [];
        this.visiblePartLoot = Array.isArray(_visiblePartLoot) ? _visiblePartLoot : [];
        this.visibleGhosts = Array.isArray(_visibleGhosts) ? _visibleGhosts : [];
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
        const nextMassTotal = getMassTotal(this.player);
        if (this.machine.state === BOT_STATES.InBattle
            && previousMassTotal !== null
            && nextMassTotal !== null
            && nextMassTotal > previousMassTotal) {
            const massGain = nextMassTotal - previousMassTotal;
            this.emitEventChat('我吃到了食物，质量 +' + massGain, this.buildWorldSnapshot(this.lastTarget, '吃食物'));
        }
        if (nextMassTotal !== null) {
            this.lastMassTotal = nextMassTotal;
        }
    }

    findOwnMeta(playersMeta) {
        const list = Array.isArray(playersMeta) ? playersMeta : [];
        const ownId = this.player && this.player.id;
        return list.find((entry) => {
            return entry
                && ((ownId && (entry.id === ownId || entry.playerId === ownId))
                    || entry.name === this.botId);
        }) || null;
    }

    getBodyHistoryEventKey(part, event) {
        const safePart = part || {};
        const safeEvent = event || {};
        return safeEvent.eventId || [
            safePart.partId || safePart.id || '',
            safeEvent.eventType || '',
            safeEvent.playerId || '',
            safeEvent.fromPlayerId || '',
            safeEvent.toPlayerId || '',
            safeEvent.at || ''
        ].join('|');
    }

    isOwnSelfCreatedPart(part, meta) {
        const ownId = meta && (meta.id || meta.playerId) || this.player && this.player.id;
        const sourceType = part && (part.sourceType || part.source);
        return Boolean(part && sourceType === 'self_created'
            && ownId
            && (part.originPlayerId === ownId || part.currentOwnerId === ownId));
    }

    isForeignCompletionPart(part, meta) {
        if (!part || this.isOwnSelfCreatedPart(part, meta)) {
            return false;
        }
        const sourceType = part.sourceType || part.source || '';
        return sourceType !== 'self_created' && sourceType !== 'starter_loadout';
    }

    hasMetaBodyCompletion(meta) {
        const parts = Array.isArray(meta && meta.bodyParts) ? meta.bodyParts : [];
        const ownTypes = COMPLETION_PART_TYPES.filter((type) => {
            return parts.some((part) => getPartType(part) === type && this.isOwnSelfCreatedPart(part, meta));
        });
        if (ownTypes.length !== 1) {
            return false;
        }
        return COMPLETION_PART_TYPES.every((type) => {
            if (ownTypes.indexOf(type) > -1) {
                return true;
            }
            return parts.some((part) => getPartType(part) === type && this.isForeignCompletionPart(part, meta));
        });
    }

    recordMetaHistoryEvents(meta) {
        const parts = Array.isArray(meta && meta.bodyParts) ? meta.bodyParts : [];
        const ownId = meta && (meta.id || meta.playerId) || this.player && this.player.id;
        parts.forEach((part) => {
            const chain = Array.isArray(part && part.historyChain) ? part.historyChain : [];
            chain.forEach((event) => {
                const eventType = event && event.eventType || '';
                const key = this.getBodyHistoryEventKey(part, event);
                if (!key || this.seenBodyHistoryEvents[key]) {
                    return;
                }
                this.seenBodyHistoryEvents[key] = true;
                if (this.machine.state !== BOT_STATES.InBattle) {
                    return;
                }

                const data = Object.assign({}, event || {}, {
                    partId: part.partId || part.id || '',
                    partType: getPartType(part),
                    displayName: part.displayName || part.label || part.templateId || ''
                });
                const displayName = data.displayName || data.partType || data.partId || 'body part';
                if (eventType === 'picked' || eventType === 'part_pickup') {
                    this.behaviorStats.bodyPartPickupEvents += 1;
                    this.logBehavior('body part pickup', '捡到 ' + displayName, data);
                    this.emitEventChat('我捡到了 ' + displayName, data);
                    return;
                }
                if ((eventType === 'stolen' || eventType === 'part_stolen')
                    && ownId
                    && (event.toPlayerId === ownId || part.currentOwnerId === ownId)) {
                    const victimName = event.playerName || event.fromPlayerName || event.fromPlayerId || 'unknown';
                    this.behaviorStats.devourEvents += 1;
                    this.logBehavior('devour', 'devour ' + victimName + '，获得 ' + displayName, data);
                    this.emitEventChat('我吃了 ' + victimName + '，拿到' + displayName, data);
                }
            });
        });
    }

    recordMetaBodyEvents(meta) {
        const bodyPartCount = typeof (meta && meta.bodyPartCount) === 'number'
            ? meta.bodyPartCount
            : (Array.isArray(meta && meta.bodyParts) ? meta.bodyParts.length : null);
        if (this.machine.state === BOT_STATES.InBattle
            && typeof this.lastBodyPartCount === 'number'
            && typeof bodyPartCount === 'number'
            && bodyPartCount < this.lastBodyPartCount) {
            this.behaviorStats.devouredEvents += 1;
            this.logBehavior('被 devour', '被 devour，部位数 ' + this.lastBodyPartCount + ' -> ' + bodyPartCount, this.buildWorldSnapshot(this.lastTarget, '被 devour'));
            this.emitEventChat('我被别人吃了，部位数 ' + this.lastBodyPartCount + ' -> ' + bodyPartCount, this.buildWorldSnapshot(this.lastTarget, '被 devour'));
        }

        this.recordMetaHistoryEvents(meta);

        if (this.machine.state === BOT_STATES.InBattle && !this.bodyCompleteLogged && this.hasMetaBodyCompletion(meta)) {
            this.bodyCompleteLogged = true;
            this.behaviorStats.bodyCompleteEvents += 1;
            this.logBehavior('body complete', '完成身体', this.buildWorldSnapshot(this.lastTarget, 'body complete'));
            this.emitEventChat('我完成身体了', this.buildWorldSnapshot(this.lastTarget, 'body complete'));
        }

        if (typeof bodyPartCount === 'number') {
            this.lastBodyPartCount = bodyPartCount;
        }
    }

    handlePlayerMetaUpdate(playersMeta) {
        const ownMeta = this.findOwnMeta(playersMeta);
        if (!ownMeta) {
            return;
        }
        this.recordMetaBodyEvents(ownMeta);
        this.player = Object.assign({}, this.player || {}, ownMeta);
    }

    markCountdown(seconds) {
        this.machine.transition(BOT_STATES.Countdown, '倒计时开始', seconds + ' 秒');
    }

    startBattle() {
        this.machine.transition(BOT_STATES.InBattle, '战斗开始', '进入战斗循环');
        this.stopMovement();
        this.battleStartedAtMs = this.now();
        this.lastSkillAtMs = this.battleStartedAtMs;
        this.movementTimer = setInterval(() => {
            this.tickBattle();
        }, this.movementIntervalMs);
    }

    logBehavior(type, message, data) {
        if (type === '战斗技能') {
            this.behaviorStats.skillEvents += 1;
        }
        if (!this.logger || typeof this.logger.bot !== 'function') {
            return;
        }
        this.logger.bot({
            botId: this.botId,
            state: this.machine.state,
            type,
            message,
            data: Object.assign({
                tick: this.battleTickCount,
                syncCount: this.syncCount
            }, data || {})
        });
    }

    emitEventChat(message, data) {
        if (!this.socket || !message) {
            return;
        }
        this.socket.emit('playerChat', {
            sender: this.botId,
            message
        });
        this.behaviorStats.chatEvents += 1;
        this.logBehavior('局内聊天', message, data || this.buildWorldSnapshot(this.lastTarget, '事件聊天'));
    }

    getSettlementActorName(event) {
        const safeEvent = event || {};
        return safeEvent.fromPlayerName
            || safeEvent.toPlayerName
            || safeEvent.playerName
            || safeEvent.fromPlayerId
            || safeEvent.toPlayerId
            || safeEvent.playerId
            || 'unknown';
    }

    recordSettlementKeyEvent(event) {
        const safeEvent = event || {};
        const eventType = safeEvent.eventType || safeEvent.type || '';
        const displayName = safeEvent.displayName || safeEvent.partType || safeEvent.partId || 'body part';
        const data = Object.assign({}, safeEvent, {
            endedReason: this.settlement && this.settlement.endedReason || ''
        });

        if (eventType === 'part_pickup' || eventType === 'picked') {
            this.behaviorStats.bodyPartPickupEvents += 1;
            this.logBehavior('body part pickup', '捡到 ' + displayName, data);
            this.emitEventChat('我捡到了 ' + displayName, data);
            return;
        }

        if (eventType === 'part_stolen' || eventType === 'stolen') {
            if (safeEvent.fromPlayerName === this.botId || safeEvent.fromPlayerId === (this.player && this.player.id)) {
                const actorName = safeEvent.toPlayerName || safeEvent.toPlayerId || this.getSettlementActorName(safeEvent);
                this.behaviorStats.devouredEvents += 1;
                this.logBehavior('被 devour', '被 ' + actorName + ' devour，失去 ' + displayName, data);
                this.emitEventChat('我被 ' + actorName + ' 吃了，失去' + displayName, data);
                return;
            }
            const actorName = this.getSettlementActorName(safeEvent);
            this.behaviorStats.devourEvents += 1;
            this.logBehavior('devour', 'devour ' + actorName + '，获得 ' + displayName, data);
            this.emitEventChat('我吃了 ' + actorName + '，拿到' + displayName, data);
            return;
        }

        if (eventType === 'devoured' || eventType === 'was_devoured') {
            this.behaviorStats.devouredEvents += 1;
            this.logBehavior('被 devour', '被 devour', data);
            this.emitEventChat('我被别人吃了', data);
        }
    }

    isSettlementWinner(settlement) {
        const safeSettlement = settlement || {};
        const winnerId = safeSettlement.winnerId || safeSettlement.winnerPlayerId || '';
        const winnerName = safeSettlement.winnerName || '';
        const ownId = this.player && this.player.id || '';
        const ownName = this.player && this.player.name || this.botId;
        return Boolean((winnerId && ownId && winnerId === ownId)
            || (winnerName && (winnerName === this.botId || winnerName === ownName)));
    }

    recordSettlementKeyEvents(settlement) {
        const safeSettlement = settlement || {};
        const keyEvents = Array.isArray(safeSettlement.keyEvents) ? safeSettlement.keyEvents : [];
        keyEvents.forEach((event) => {
            this.recordSettlementKeyEvent(event);
        });
        if (safeSettlement.endedReason === 'body_complete' && this.isSettlementWinner(safeSettlement) && !this.bodyCompleteLogged) {
            this.bodyCompleteLogged = true;
            this.behaviorStats.bodyCompleteEvents += 1;
            this.logBehavior('body complete', '完成身体，winner=' + (safeSettlement.winnerName || ''), {
                endedReason: safeSettlement.endedReason,
                winnerName: safeSettlement.winnerName || ''
            });
            this.emitEventChat('我完成身体了', {
                endedReason: safeSettlement.endedReason,
                winnerName: safeSettlement.winnerName || ''
            });
        }
    }

    recordMovementStats(targetSource) {
        this.behaviorStats.movementEvents += 1;
        if (targetSource === '可见食物') {
            this.behaviorStats.resourceTargetEvents += 1;
        } else if (targetSource === '随机巡航') {
            this.behaviorStats.randomCruiseEvents += 1;
        } else if (targetSource === '避让大玩家') {
            this.behaviorStats.avoidanceEvents += 1;
        } else if (targetSource === '追击小玩家') {
            this.behaviorStats.pursuitEvents += 1;
        } else if (targetSource === 'part loot') {
            this.behaviorStats.partLootTargetEvents += 1;
        }
    }

    isFirstMovementSource(targetSource) {
        if (targetSource === '可见食物') {
            return this.behaviorStats.resourceTargetEvents === 0;
        }
        if (targetSource === '随机巡航') {
            return this.behaviorStats.randomCruiseEvents === 0;
        }
        if (targetSource === '避让大玩家') {
            return this.behaviorStats.avoidanceEvents === 0;
        }
        if (targetSource === '追击小玩家') {
            return this.behaviorStats.pursuitEvents === 0;
        }
        if (targetSource === 'part loot') {
            return this.behaviorStats.partLootTargetEvents === 0;
        }
        return false;
    }

    buildWorldSnapshot(target, targetSource) {
        const player = this.player || {};
        return {
            x: typeof player.x === 'number' ? Math.round(player.x) : null,
            y: typeof player.y === 'number' ? Math.round(player.y) : null,
            massTotal: typeof player.massTotal === 'number' ? Math.round(player.massTotal) : null,
            targetX: target && typeof target.x === 'number' ? Math.round(target.x) : null,
            targetY: target && typeof target.y === 'number' ? Math.round(target.y) : null,
            targetSource,
            visiblePlayers: this.visiblePlayers.length,
            visibleFood: this.visibleFood.length,
            visibleMass: this.visibleMass.length,
            visibleViruses: this.visibleViruses.length,
            visiblePartLoot: this.visiblePartLoot.length,
            visibleGhosts: this.visibleGhosts.length
        };
    }

    getMovementChatMessage(targetSource, fallbackMessage) {
        if (targetSource === '可见食物') {
            return '我去追食物';
        }
        if (targetSource === 'part loot') {
            return '我去捡部位';
        }
        if (targetSource === '随机巡航') {
            return '我在巡游找目标';
        }
        if (targetSource === '避让大玩家') {
            return '我在躲大玩家';
        }
        if (targetSource === '追击小玩家') {
            return '我去追小玩家';
        }
        if (targetSource === 'devour 风险') {
            return '我在靠近大玩家，测试被吃风险';
        }
        return fallbackMessage || '我在行动';
    }

    getSkillChatMessage(eventName) {
        if (eventName === '1') {
            return '我吐出孢子';
        }
        if (eventName === '2') {
            return '我分裂了';
        }
        if (eventName === '3') {
            return '我尝试连接';
        }
        return '我使用技能';
    }

    emitBattleSkill(eventName, message, statKey, target, targetSource, now) {
        this.socket.emit(eventName);
        if (statKey) {
            this.behaviorStats[statKey] += 1;
        }
        this.lastSkillAtMs = typeof now === 'number' ? now : this.now();
        const snapshot = this.buildWorldSnapshot(target, targetSource);
        this.logBehavior('战斗技能', message, snapshot);
        this.emitEventChat(this.getSkillChatMessage(eventName), snapshot);
    }

    getNextRequiredSkill() {
        if (this.behaviorStats.ejectMassEvents === 0) {
            return {
                eventName: '1',
                message: '执行吐孢子',
                statKey: 'ejectMassEvents'
            };
        }
        if (this.behaviorStats.splitEvents === 0) {
            return {
                eventName: '2',
                message: '执行分裂',
                statKey: 'splitEvents'
            };
        }
        if (this.behaviorStats.connectionAttemptEvents === 0) {
            return {
                eventName: '3',
                message: '执行连接尝试',
                statKey: 'connectionAttemptEvents'
            };
        }
        return null;
    }

    canUseSkill(now) {
        return now - this.lastSkillAtMs >= this.skillCooldownMs;
    }

    emitRandomSkillIfReady(now, targetSource) {
        if (!this.canUseSkill(now)) {
            return false;
        }
        if (this.random() > 0.92) {
            this.emitBattleSkill('1', '执行吐孢子', 'ejectMassEvents', this.lastTarget, targetSource, now);
            return true;
        }
        if (this.random() > 0.97) {
            this.emitBattleSkill('2', '执行分裂', 'splitEvents', this.lastTarget, targetSource, now);
            return true;
        }
        if (this.random() > 0.98) {
            this.emitBattleSkill('3', '执行连接尝试', 'connectionAttemptEvents', this.lastTarget, targetSource, now);
            return true;
        }
        return false;
    }

    buildRandomCruiseTarget(width, height) {
        return {
            x: Math.round(this.random() * width),
            y: Math.round(this.random() * height)
        };
    }

    buildAvoidanceTarget(width, height) {
        const player = this.player || {};
        const nearbyPlayer = this.visiblePlayers[0] || {
            x: (player.x || width / 2) + 120,
            y: player.y || height / 2
        };
        const dx = (player.x || width / 2) - (nearbyPlayer.x || 0);
        const dy = (player.y || height / 2) - (nearbyPlayer.y || 0);
        const length = Math.hypot(dx, dy) || 1;

        return {
            x: Math.round(clamp((player.x || width / 2) + (dx / length) * 420, 0, width)),
            y: Math.round(clamp((player.y || height / 2) + (dy / length) * 420, 0, height))
        };
    }

    buildPursuitTarget(width, height) {
        const player = this.player || {};
        const nearbyPlayer = this.findSmallerVisiblePlayer()
            || this.visiblePlayers[0]
            || {
            x: (player.x || width / 2) + 160,
            y: (player.y || height / 2) + 60
        };

        return {
            x: Math.round(clamp(nearbyPlayer.x || player.x || width / 2, 0, width)),
            y: Math.round(clamp(nearbyPlayer.y || player.y || height / 2, 0, height))
        };
    }

    getOwnMass() {
        return this.player && typeof this.player.massTotal === 'number' ? this.player.massTotal : 0;
    }

    getVisiblePlayerMass(player) {
        return player && typeof player.massTotal === 'number' ? player.massTotal : 0;
    }

    findSmallerVisiblePlayer() {
        const ownMass = this.getOwnMass();
        const player = this.player || {};
        return (this.visiblePlayers || [])
            .filter((entry) => entry && this.getVisiblePlayerMass(entry) > 0 && ownMass > this.getVisiblePlayerMass(entry) * 1.1)
            .sort((a, b) => {
                const distanceA = Math.hypot((a.x || 0) - (player.x || 0), (a.y || 0) - (player.y || 0));
                const distanceB = Math.hypot((b.x || 0) - (player.x || 0), (b.y || 0) - (player.y || 0));
                return distanceA - distanceB;
            })[0] || null;
    }

    findLargerVisiblePlayer() {
        const ownMass = this.getOwnMass();
        const player = this.player || {};
        return (this.visiblePlayers || [])
            .filter((entry) => entry && ownMass > 0 && this.getVisiblePlayerMass(entry) > ownMass * 1.1)
            .sort((a, b) => {
                const distanceA = Math.hypot((a.x || 0) - (player.x || 0), (a.y || 0) - (player.y || 0));
                const distanceB = Math.hypot((b.x || 0) - (player.x || 0), (b.y || 0) - (player.y || 0));
                return distanceA - distanceB;
            })[0] || null;
    }

    getCombatTarget(width, height) {
        if (this.behaviorStats.devourEvents === 0) {
            const smallerPlayer = this.findSmallerVisiblePlayer();
            if (smallerPlayer) {
                return {
                    target: {
                        x: Math.round(clamp(smallerPlayer.x || width / 2, 0, width)),
                        y: Math.round(clamp(smallerPlayer.y || height / 2, 0, height))
                    },
                    targetSource: '追击小玩家',
                    message: '追击小玩家，争取 devour'
                };
            }
        }

        if (this.behaviorStats.devouredEvents === 0 && this.behaviorStats.avoidanceEvents > 0) {
            const largerPlayer = this.findLargerVisiblePlayer();
            if (largerPlayer) {
                return {
                    target: {
                        x: Math.round(clamp(largerPlayer.x || width / 2, 0, width)),
                        y: Math.round(clamp(largerPlayer.y || height / 2, 0, height))
                    },
                    targetSource: 'devour 风险',
                    message: '靠近大玩家，制造被 devour 风险'
                };
            }
        }

        return null;
    }

    buildPartLootTarget(width, height) {
        const loot = this.visiblePartLoot[0] || {};
        return {
            x: Math.round(clamp(loot.x || width / 2, 0, width)),
            y: Math.round(clamp(loot.y || height / 2, 0, height))
        };
    }

    normalizeInputTarget(target) {
        return {
            x: Math.round(target && typeof target.x === 'number' ? target.x : 0),
            y: Math.round(target && typeof target.y === 'number' ? target.y : 0)
        };
    }

    resolveWorldTargetFromInput(inputTarget) {
        const player = this.player || {};
        const input = this.normalizeInputTarget(inputTarget);
        if (!hasPosition(player)) {
            return input;
        }
        return {
            x: Math.round(player.x + input.x),
            y: Math.round(player.y + input.y)
        };
    }

    buildMovementInput(worldTarget) {
        const player = this.player || {};
        if (!hasPosition(player)) {
            return this.normalizeInputTarget(worldTarget);
        }
        return {
            x: Math.round((worldTarget && typeof worldTarget.x === 'number' ? worldTarget.x : player.x) - player.x),
            y: Math.round((worldTarget && typeof worldTarget.y === 'number' ? worldTarget.y : player.y) - player.y)
        };
    }

    recordGhostEncounterIfNeeded() {
        if (this.behaviorStats.ghostEncounterEvents > 0 || !this.visibleGhosts.length) {
            return;
        }
        const ghost = this.visibleGhosts[0] || {};
        this.behaviorStats.ghostEncounterEvents += 1;
        const snapshot = this.buildWorldSnapshot({
            x: typeof ghost.x === 'number' ? ghost.x : this.lastTarget.x,
            y: typeof ghost.y === 'number' ? ghost.y : this.lastTarget.y
        }, 'ghost');
        this.logBehavior('ghost 出现/遭遇', 'ghost 出现，改向移动', snapshot);
        this.emitEventChat('我看到 ghost，正在绕开', snapshot);
    }

    pickBattleTarget(width, height) {
        if (this.behaviorStats.resourceTargetEvents === 0 && this.visibleFood.length) {
            return {
                target: this.visibleFood[Math.floor(this.random() * this.visibleFood.length)],
                targetSource: '可见食物',
                message: '移动追资源'
            };
        }
        if (this.behaviorStats.bodyPartPickupEvents === 0 && this.visiblePartLoot.length) {
            return {
                target: this.buildPartLootTarget(width, height),
                targetSource: 'part loot',
                message: '追 part loot'
            };
        }
        if (this.behaviorStats.randomCruiseEvents === 0) {
            return {
                target: this.buildRandomCruiseTarget(width, height),
                targetSource: '随机巡航',
                message: '随机移动'
            };
        }
        if (this.behaviorStats.avoidanceEvents === 0) {
            return {
                target: this.buildAvoidanceTarget(width, height),
                targetSource: '避让大玩家',
                message: '避让大玩家'
            };
        }
        if (this.behaviorStats.pursuitEvents === 0) {
            return {
                target: this.buildPursuitTarget(width, height),
                targetSource: '追击小玩家',
                message: '追击小玩家'
            };
        }

        const combatTarget = this.getCombatTarget(width, height);
        if (combatTarget) {
            return combatTarget;
        }

        const foodTarget = this.visibleFood.length ? this.visibleFood[Math.floor(this.random() * this.visibleFood.length)] : null;
        const partLootTarget = !foodTarget && this.visiblePartLoot.length ? this.buildPartLootTarget(width, height) : null;
        return {
            target: foodTarget || partLootTarget || this.buildRandomCruiseTarget(width, height),
            targetSource: foodTarget ? '可见食物' : (partLootTarget ? 'part loot' : '随机巡航'),
            message: foodTarget ? '移动追资源' : (partLootTarget ? '追 part loot' : '随机移动')
        };
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
        this.socket.emit('0', this.lastInputTarget);
    }

    tickBattle() {
        if (!this.socket || this.machine.state !== BOT_STATES.InBattle) {
            return;
        }
        const now = this.now();
        this.battleTickCount += 1;
        const width = this.game && this.game.width ? this.game.width : 5000;
        const height = this.game && this.game.height ? this.game.height : 5000;
        this.recordGhostEncounterIfNeeded();
        const movement = this.pickBattleTarget(width, height);
        const target = movement.target;
        const targetSource = movement.targetSource;
        this.lastTarget = {
            x: target.x,
            y: target.y
        };
        this.lastInputTarget = this.buildMovementInput(this.lastTarget);
        this.socket.emit('0', this.lastInputTarget);
        if (this.isFirstMovementSource(targetSource)
            || this.battleTickCount === 1
            || this.battleTickCount % this.behaviorLogEveryTicks === 0) {
            const snapshot = this.buildWorldSnapshot(this.lastTarget, targetSource);
            this.logBehavior('战斗行为', movement.message, snapshot);
            this.emitEventChat(this.getMovementChatMessage(targetSource, movement.message), snapshot);
        }
        this.recordMovementStats(targetSource);
        const requiredSkill = this.getNextRequiredSkill();
        if (requiredSkill && this.canUseSkill(now)) {
            this.emitBattleSkill(requiredSkill.eventName, requiredSkill.message, requiredSkill.statKey, this.lastTarget, targetSource, now);
            return;
        }
        this.emitRandomSkillIfReady(now, targetSource);
    }

    requestSettlement() {
        if (!this.socket || this.machine.state === BOT_STATES.Finished) {
            return;
        }
        this.machine.transition(BOT_STATES.Settling, '请求结算', '跳过快速结算聊天命令，等待服务端 settlement');
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

    getBehaviorStats() {
        return Object.assign({}, this.behaviorStats);
    }
}

module.exports = {
    SimulatedPlayerClient,
    wait
};
