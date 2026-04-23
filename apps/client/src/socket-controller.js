'use strict';

var hydratePlayerState = require('./player-hydration');

function createSocketController(options) {
    var socket = null;
    var socketType = null;

    function debug(message) {
        if (options.debug) {
            options.debug(message);
        }
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
        if (!player.connectionTargetId || !userData) {
            return null;
        }

        for (var i = 0; i < userData.length; i++) {
            if (userData[i].id === player.connectionTargetId) {
                return userData[i].playerCardPreviewDataUrl || null;
            }
        }

        return null;
    }

    function handleDisconnect() {
        options.global.disconnected = true;
        options.global.gameStart = false;
        assignSocket(null);
        if (!options.global.kicked) {
            options.render.drawErrorMessage(options.i18n.t('system.disconnected'), options.graph, options.global.screen);
        }
    }

    function handleConnectError(error) {
        debug('Connect error: ' + (error && error.message ? error.message : error));
        if (socket && socket.active === false) {
            handleDisconnect();
        }
    }

    function bindSocket(nextSocket) {
        nextSocket.on('pongcheck', function () {
            var latency = Date.now() - options.global.startPingTime;
            debug('Latency: ' + latency + 'ms');
            options.getChat().addSystemLine(options.i18n.t('system.ping', {latency: latency}));
        });

        nextSocket.on('connect_error', handleConnectError);
        nextSocket.on('disconnect', handleDisconnect);

        nextSocket.on('welcome', function (playerSettings, gameSizes) {
            var nextPlayer = playerSettings;
            nextPlayer.name = options.global.playerName;
            nextPlayer.screenWidth = options.global.screen.width;
            nextPlayer.screenHeight = options.global.screen.height;
            nextPlayer.target = options.getCanvasTarget();
            nextPlayer.playerCardPreviewDataUrl = options.getPlayerCardPreviewDataUrl();
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
            options.resize();
        });

        nextSocket.on('playerDied', function (data) {
            var playerName = data.playerEatenName || data.name;
            var playerLabel = isUnnamedCell(playerName) ? options.i18n.t('hud.unnamedCell') : playerName;
            options.getChat().addSystemLine(options.i18n.t('system.playerEaten', {name: playerLabel}));
        });

        nextSocket.on('playerDisconnect', function (data) {
            options.getChat().addSystemLine(options.i18n.t('system.playerDisconnected', {
                name: isUnnamedCell(data.name) ? options.i18n.t('hud.unnamedCell') : data.name
            }));
        });

        nextSocket.on('playerJoin', function (data) {
            options.getChat().addSystemLine(options.i18n.t('system.playerJoined', {
                name: isUnnamedCell(data.name) ? options.i18n.t('hud.unnamedCell') : data.name
            }));
        });

        nextSocket.on('leaderboard', function (data) {
            options.setLeaderboard(data.leaderboard);
            options.renderStatusPanel();
        });

        nextSocket.on('serverMSG', function (data) {
            options.getChat().addSystemLine(data);
        });

        nextSocket.on('serverSendPlayerChat', function (data) {
            options.getChat().addChatLine(data.sender, data.message, false);
        });

        nextSocket.on('serverTellPlayerMove', function (playerData, userData, foodsList, massList, virusList) {
            if (options.global.playerType === 'player') {
                hydratePlayerState(options.getPlayer(), playerData);
            }
            options.setWorldState({
                users: userData,
                foods: foodsList,
                fireFood: massList,
                viruses: virusList
            });
            options.global.targetPlayerCardPreviewDataUrl = findConnectedTargetCardPreview(userData);
            options.renderStatusPanel();
            options.renderPlayerCardPreviews();
        });

        nextSocket.on('RIP', function () {
            options.global.gameStart = false;
            options.render.drawErrorMessage(options.i18n.t('system.youDied'), options.graph, options.global.screen);
            options.window.setTimeout(function () {
                options.document.getElementById('gameAreaWrapper').style.opacity = 0;
                options.document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
                if (options.global.animLoopHandle) {
                    options.window.cancelAnimationFrame(options.global.animLoopHandle);
                    options.global.animLoopHandle = undefined;
                }
            }, 2500);
        });

        nextSocket.on('kick', function (reason) {
            options.global.gameStart = false;
            options.global.kicked = true;
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
