'use strict';

var hydratePlayerState = require('./player-hydration');

function createSocketController(options) {
    var socket = null;
    var socketType = null;
    var lastHudRenderAt = 0;
    var playerMetaById = {};
    var playerMetaSignatures = {};
    var HUD_RENDER_INTERVAL_MS = 120;

    function debug(message) {
        if (options.debug) {
            options.debug(message);
        }
    }

    function logDebugPanel(message, level) {
        if (options.debugPanel) {
            options.debugPanel.log(message, level || 'info');
        }
    }

    function markDebugSocketEvent(eventName) {
        if (options.debugPanel) {
            options.debugPanel.markSocketEvent(eventName);
        }
    }

    function updateDebugPanel(patch) {
        if (options.debugPanel) {
            options.debugPanel.update(patch);
        }
    }

    function recordDebugHandlerTiming(eventName, startedAt) {
        if (options.debugPanel && typeof options.debugPanel.recordHandlerTiming === 'function') {
            options.debugPanel.recordHandlerTiming(eventName, Date.now() - startedAt);
        }
    }

    function countUserCells(userData) {
        var total = 0;
        (userData || []).forEach(function (user) {
            total += Array.isArray(user.cells) ? user.cells.length : 0;
        });
        return total;
    }

    function countMetaBodyParts(metaList) {
        var total = 0;
        (metaList || []).forEach(function (meta) {
            if (typeof meta.bodyPartCount === 'number') {
                total += meta.bodyPartCount;
            } else if (Array.isArray(meta.bodyParts)) {
                total += meta.bodyParts.length;
            }
        });
        return total;
    }

    function recordDebugMovementPayload(userData, foodsList, massList, virusList, partLootList, ghostList, startedAt) {
        if (!options.debugPanel || typeof options.debugPanel.recordMovementPayload !== 'function') {
            return;
        }
        options.debugPanel.recordMovementPayload({
            players: (userData || []).length,
            cells: countUserCells(userData),
            foods: (foodsList || []).length,
            fireFood: (massList || []).length,
            viruses: (virusList || []).length,
            partLoot: (partLootList || []).length,
            ghosts: (ghostList || []).length
        }, Date.now() - startedAt);
    }

    function recordDebugMetaPayload(metaList, startedAt) {
        if (!options.debugPanel || typeof options.debugPanel.recordMetaPayload !== 'function') {
            return;
        }
        options.debugPanel.recordMetaPayload({
            items: (metaList || []).length,
            bodyParts: countMetaBodyParts(metaList)
        }, Date.now() - startedAt);
    }

    function assignSocket(nextSocket) {
        socket = nextSocket;
        options.assignSocket(nextSocket);
    }

    function isUnnamedCell(name) {
        return !name || name.length < 1;
    }

    function findConnectedTargetCardPreview(userData) {
        var player = options.getPlayer();
        if (!player || !player.connectionTargetId || !userData) {
            return null;
        }

        for (var i = 0; i < userData.length; i++) {
            if (userData[i].id === player.connectionTargetId) {
                return userData[i].playerCardPreviewDataUrl || null;
            }
        }

        return null;
    }

    function cachePlayerMeta(metaList) {
        if (!Array.isArray(metaList)) {
            return false;
        }

        var changed = false;
        metaList.forEach(function (meta) {
            if (!meta || !meta.id) {
                return;
            }
            var signature = JSON.stringify(meta);
            if (playerMetaSignatures[meta.id] === signature) {
                return;
            }
            playerMetaSignatures[meta.id] = signature;
            playerMetaById[meta.id] = Object.assign({}, playerMetaById[meta.id] || {}, meta);
            changed = true;
        });
        return changed;
    }

    function hydrateLocalPlayerMeta() {
        var player = options.getPlayer();
        if (!player || !player.id || !playerMetaById[player.id]) {
            return;
        }

        hydratePlayerState(player, playerMetaById[player.id]);
    }

    function mergePlayerMeta(user) {
        if (!user || !user.id || !playerMetaById[user.id]) {
            return user;
        }

        return Object.assign({}, playerMetaById[user.id], user);
    }

    function mergePlayerMetaList(userData) {
        return (userData || []).map(mergePlayerMeta);
    }

    function renderHud(force) {
        var now = Date.now();
        if (!force && now - lastHudRenderAt < HUD_RENDER_INTERVAL_MS) {
            return;
        }
        lastHudRenderAt = now;
        options.renderStatusPanel();
        options.renderPlayerCardPreviews();
    }

    function handleDisconnect() {
        markDebugSocketEvent('disconnect');
        logDebugPanel('Socket 已断开，游戏循环暂停。', 'warn');
        updateDebugPanel({
            socket: {
                connected: false
            },
            game: {
                started: false
            }
        });
        options.global.disconnected = true;
        options.global.gameStart = false;
        if (options.chatInput) {
            options.chatInput.hide();
        }
        assignSocket(null);
        if (!options.global.kicked) {
            options.render.drawErrorMessage(options.i18n.t('system.disconnected'), options.graph, options.global.screen);
        }
    }

    function handleConnectError(error) {
        debug('Connect error: ' + (error && error.message ? error.message : error));
        markDebugSocketEvent('connect_error');
        logDebugPanel('连接失败：' + (error && error.message ? error.message : error), 'warn');
        if (socket && socket.active === false) {
            handleDisconnect();
        }
    }

    function bindSocket(nextSocket) {
        nextSocket.on('pongcheck', function () {
            markDebugSocketEvent('pongcheck');
            var latency = Date.now() - options.global.startPingTime;
            debug('Latency: ' + latency + 'ms');
            updateDebugPanel({
                socket: {
                    latencyMs: latency,
                    connected: true
                }
            });
            logDebugPanel('Ping 返回，延迟 ' + latency + 'ms。', latency > 180 ? 'warn' : 'ok');
            options.getChat().addSystemLine(options.i18n.t('system.ping', {latency: latency}));
        });

        nextSocket.on('connect_error', handleConnectError);
        nextSocket.on('disconnect', handleDisconnect);

        nextSocket.on('welcome', function (playerSettings, gameSizes) {
            markDebugSocketEvent('welcome');
            var nextPlayer = playerSettings;
            nextPlayer.name = options.global.playerName;
            nextPlayer.screenWidth = options.global.screen.width;
            nextPlayer.screenHeight = options.global.screen.height;
            nextPlayer.target = options.getCanvasTarget();
            nextPlayer.playerCardPreviewDataUrl = options.getPlayerCardPreviewDataUrl();
            nextPlayer.bodySignature = options.global.bodySignature || null;
            nextPlayer.consentToRecord = options.global.consentToRecord !== false;
            nextPlayer.isReplayAllowed = nextPlayer.consentToRecord;
            options.setPlayer(nextPlayer);
            options.getChat().player = nextPlayer;
            nextSocket.emit('gotit', nextPlayer);
            options.global.gameStart = true;
            options.getChat().addSystemLine(options.i18n.t('system.connected'));
            options.getChat().addSystemLine(options.i18n.t('system.help'));
            if (options.global.mobile) {
                options.document.getElementById('gameAreaWrapper').removeChild(options.document.getElementById('chatbox'));
            }
            options.canvasElement.focus();
            options.global.game.width = gameSizes.width;
            options.global.game.height = gameSizes.height;
            updateDebugPanel({
                socket: {
                    connected: true
                },
                game: {
                    started: true,
                    playerType: options.global.playerType
                }
            });
            logDebugPanel('收到 welcome，地图 ' + gameSizes.width + 'x' + gameSizes.height + '。', 'ok');
            if (options.chatInput) {
                options.chatInput.show();
            }
            options.resize();
        });

        nextSocket.on('playerDied', function (data) {
            var startedAt = Date.now();
            markDebugSocketEvent('playerDied');
            var playerName = data.playerEatenName || data.name;
            var playerLabel = isUnnamedCell(playerName) ? options.i18n.t('hud.unnamedCell') : playerName;
            if (options.debugPanel && typeof options.debugPanel.startDevourProbe === 'function') {
                options.debugPanel.startDevourProbe(playerLabel);
            }
            logDebugPanel('玩家死亡事件：' + playerLabel + ' 被吃掉。', 'info');
            options.getChat().addSystemLine(options.i18n.t('system.playerEaten', {name: playerLabel}));
            recordDebugHandlerTiming('playerDied', startedAt);
        });

        nextSocket.on('playerDisconnect', function (data) {
            markDebugSocketEvent('playerDisconnect');
            logDebugPanel('玩家离开：' + (isUnnamedCell(data.name) ? '未命名单元' : data.name) + '。', 'info');
            options.getChat().addSystemLine(options.i18n.t('system.playerDisconnected', {
                name: isUnnamedCell(data.name) ? options.i18n.t('hud.unnamedCell') : data.name
            }));
        });

        nextSocket.on('playerJoin', function (data) {
            markDebugSocketEvent('playerJoin');
            logDebugPanel('玩家加入：' + (isUnnamedCell(data.name) ? '未命名单元' : data.name) + '。', 'info');
            options.getChat().addSystemLine(options.i18n.t('system.playerJoined', {
                name: isUnnamedCell(data.name) ? options.i18n.t('hud.unnamedCell') : data.name
            }));
        });

        nextSocket.on('leaderboard', function (data) {
            var startedAt = Date.now();
            markDebugSocketEvent('leaderboard');
            options.setLeaderboard(data.leaderboard);
            logDebugPanel('排行榜更新，条目 ' + ((data.leaderboard || []).length) + ' 个。', 'info');
            renderHud(true);
            recordDebugHandlerTiming('leaderboard', startedAt);
        });

        nextSocket.on('playerMetaUpdate', function (metaList) {
            var startedAt = Date.now();
            markDebugSocketEvent('playerMetaUpdate');
            var changed = cachePlayerMeta(metaList);
            if (!changed) {
                recordDebugMetaPayload(metaList, startedAt);
                recordDebugHandlerTiming('playerMetaUpdate', startedAt);
                return;
            }
            hydrateLocalPlayerMeta();
            logDebugPanel('玩家元数据更新，条目 ' + ((metaList || []).length) + ' 个。', 'info');
            renderHud(true);
            recordDebugMetaPayload(metaList, startedAt);
            recordDebugHandlerTiming('playerMetaUpdate', startedAt);
        });

        nextSocket.on('serverMSG', function (data) {
            markDebugSocketEvent('serverMSG');
            options.getChat().addSystemLine(data);
        });

        nextSocket.on('serverSendPlayerChat', function (data) {
            markDebugSocketEvent('serverSendPlayerChat');
            options.getChat().addChatLine(data.sender, data.message, false);
        });

        nextSocket.on('npc:speak', function (data) {
            markDebugSocketEvent('npc:speak');
            logDebugPanel('NPC 输出：' + (data.npcName || data.npcId || '未知 NPC') + ' 说话。', 'ok');
            if (options.speechBubble) {
                options.speechBubble.show(data.npcId, data.text, data.duration || 3000);
            }
            if (options.getChat) {
                options.getChat().addChatLine(data.npcName || data.npcId, data.text, false);
            }
        });

        nextSocket.on('npc:paint', function (data) {
            var localPlayer = options.getPlayer();
            if (!localPlayer) {
                return;
            }
            if (data && data.targetId && localPlayer.id && data.targetId !== localPlayer.id) {
                return;
            }

            markDebugSocketEvent('npc:paint');
            localPlayer.playerCardPreviewDataUrl = data.previewDataUrl || localPlayer.playerCardPreviewDataUrl;
            logDebugPanel('NPC 名片绘制输出已收到。', 'ok');
            if (options.paintToast) {
                options.paintToast.show(data.message || (data.npcName + ' 在你身上画了一笔'), 2000);
            }
            options.renderPlayerCardPreviews();
        });

        nextSocket.on('settlement', function (data) {
            var startedAt = Date.now();
            markDebugSocketEvent('settlement');
            if (options.debugPanel && typeof options.debugPanel.recordDevourMilestone === 'function') {
                options.debugPanel.recordDevourMilestone('settlement');
            }
            logDebugPanel('结算输出已收到。', 'ok');
            if (options.settlementPanel) {
                options.settlementPanel.show(data);
            }
            recordDebugHandlerTiming('settlement', startedAt);
        });

        nextSocket.on('serverTellPlayerMove', function (playerData, userData, foodsList, massList, virusList, partLootList, ghostList) {
            var startedAt = Date.now();
            markDebugSocketEvent('serverTellPlayerMove');
            if (options.global.playerType === 'player') {
                hydrateLocalPlayerMeta();
                hydratePlayerState(options.getPlayer(), playerData);
            }
            var mergedUsers = mergePlayerMetaList(userData);
            options.setWorldState({
                users: mergedUsers,
                foods: foodsList,
                fireFood: massList,
                viruses: virusList,
                partLoot: partLootList || [],
                ghosts: ghostList || []
            });
            options.global.targetPlayerCardPreviewDataUrl = findConnectedTargetCardPreview(mergedUsers);
            renderHud(false);
            recordDebugMovementPayload(userData, foodsList, massList, virusList, partLootList, ghostList, startedAt);
            recordDebugHandlerTiming('serverTellPlayerMove', startedAt);
        });

        nextSocket.on('RIP', function () {
            var startedAt = Date.now();
            markDebugSocketEvent('RIP');
            if (options.debugPanel && typeof options.debugPanel.recordDevourMilestone === 'function') {
                options.debugPanel.recordDevourMilestone('RIP');
            }
            logDebugPanel('本机玩家死亡，准备回到开始菜单。', 'warn');
            options.global.gameStart = false;
            updateDebugPanel({
                game: {
                    started: false
                }
            });
            if (options.chatInput) {
                options.chatInput.hide();
            }
            options.render.drawErrorMessage(options.i18n.t('system.youDied'), options.graph, options.global.screen);
            options.window.setTimeout(function () {
                options.document.getElementById('gameAreaWrapper').style.opacity = 0;
                options.document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
                if (options.global.animLoopHandle) {
                    options.window.cancelAnimationFrame(options.global.animLoopHandle);
                    options.global.animLoopHandle = undefined;
                }
            }, 2500);
            recordDebugHandlerTiming('RIP', startedAt);
        });

        nextSocket.on('kick', function (reason) {
            markDebugSocketEvent('kick');
            logDebugPanel('本机玩家被踢出：' + (reason || '未提供原因') + '。', 'warn');
            options.global.gameStart = false;
            options.global.kicked = true;
            updateDebugPanel({
                socket: {
                    connected: false
                },
                game: {
                    started: false
                }
            });
            if (options.chatInput) {
                options.chatInput.hide();
            }
            if (reason !== '') {
                options.render.drawErrorMessage(options.i18n.t('system.kickedReason', {reason: reason}), options.graph, options.global.screen);
            } else {
                options.render.drawErrorMessage(options.i18n.t('system.kicked'), options.graph, options.global.screen);
            }
            nextSocket.close();
        });
    }

    function resetSocketForTypeSwitch() {
        if (!socket) {
            return;
        }

        if (typeof socket.removeAllListeners === 'function') {
            socket.removeAllListeners();
        }
        socket.close();
        assignSocket(null);
        socketType = null;
        playerMetaById = {};
        playerMetaSignatures = {};
    }

    function ensureSocket(type) {
        if (socket && !socket.disconnected && socketType === type) {
            assignSocket(socket);
            return socket;
        }

        if (socket && !socket.disconnected && socketType !== type) {
            resetSocketForTypeSwitch();
        }

        socket = options.io({query: 'type=' + type});
        socketType = type;
        logDebugPanel('正在建立 ' + type + ' Socket 连接。', 'info');
        bindSocket(socket);
        assignSocket(socket);
        return socket;
    }

    function connect(type) {
        var nextSocket = ensureSocket(type);
        nextSocket.emit('respawn');
        return nextSocket;
    }

    return {
        connect: connect,
        getSocket: function () {
            return socket;
        }
    };
}

module.exports = createSocketController;
