'use strict';

const SAT = require('sat');

const body = require('./body');
const settlement = require('./settlement');
const util = require('./lib/util');
const {
    createSpectatorSyncData,
    projectPlayersForSync,
    projectVisibleWorldForSync
} = require('./player-projection');

function createGameLoopService(options) {
    const config = options.config;
    const map = options.map;
    const io = options.io;
    const connectionService = options.connectionService;
    const ghostManager = options.ghostManager;
    const ghostRecorder = options.ghostRecorder;
    const memoryStore = options.memoryStore;
    const getRoundClock = options.getRoundClock || function () {
        return {startedAt: Date.now()};
    };
    const getSocket = options.getSocket;
    const getSpectatorIds = options.getSpectatorIds;
    const initMassLog = util.mathLog(config.defaultPlayerMass, config.slowBase);

    let leaderboard = [];
    let leaderboardChanged = false;

    const Vector = SAT.Vector;

    function calculateLeaderboard() {
        const topPlayers = map.players.getTopPlayers();

        if (leaderboard.length !== topPlayers.length) {
            leaderboard = topPlayers;
            leaderboardChanged = true;
            return;
        }

        for (let i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].id !== topPlayers[i].id) {
                leaderboard = topPlayers;
                leaderboardChanged = true;
                return;
            }
        }
    }

    function sendLeaderboard(socket) {
        if (!socket) {
            return;
        }

        socket.emit('leaderboard', {
            players: map.players.data.length,
            leaderboard
        });
    }

    function tickPlayer(currentPlayer) {
        const socket = getSocket(currentPlayer.id);
        if (!currentPlayer.isNpc && currentPlayer.lastHeartbeat < new Date().getTime() - config.maxHeartbeatInterval) {
            if (socket) {
                socket.emit('kick', 'Last heartbeat received over ' + config.maxHeartbeatInterval + ' ago.');
                socket.disconnect();
            }
            return;
        }

        currentPlayer.move(config.slowBase, config.gameWidth, config.gameHeight, initMassLog);
        if (!currentPlayer.isNpc && currentPlayer.activePet) {
            currentPlayer.activePet.x = Math.max(0, Math.min(config.gameWidth, currentPlayer.x - 54));
            currentPlayer.activePet.y = Math.max(0, Math.min(config.gameHeight, currentPlayer.y + 42));
        }

        const isEntityInsideCircle = (point, circle) => {
            return SAT.pointInCircle(new Vector(point.x, point.y), circle);
        };

        const canEatMass = (cell, cellCircle, cellIndex, mass) => {
            if (isEntityInsideCircle(mass, cellCircle)) {
                if (mass.id === currentPlayer.id && mass.speed > 0 && cellIndex === mass.num) {
                    return false;
                }
                if (cell.mass > mass.mass * 1.1) {
                    return true;
                }
            }

            return false;
        };

        const canEatVirus = (cell, cellCircle, virus) => {
            return virus.mass < cell.mass && isEntityInsideCircle(virus, cellCircle);
        };

        const cellsToSplit = [];
        for (let cellIndex = 0; cellIndex < currentPlayer.cells.length; cellIndex++) {
            const currentCell = currentPlayer.cells[cellIndex];
            const cellCircle = currentCell.toCircle();

            const eatenFoodIndexes = util.getIndexes(map.food.data, food => isEntityInsideCircle(food, cellCircle));
            const eatenMassIndexes = util.getIndexes(map.massFood.data, mass => canEatMass(currentCell, cellCircle, cellIndex, mass));
            const eatenVirusIndexes = util.getIndexes(map.viruses.data, virus => canEatVirus(currentCell, cellCircle, virus));

            if (eatenVirusIndexes.length > 0) {
                cellsToSplit.push(cellIndex);
                map.viruses.delete(eatenVirusIndexes);
            }

            let massGained = eatenMassIndexes.reduce((acc, index) => acc + map.massFood.data[index].mass, 0);

            map.food.delete(eatenFoodIndexes);
            map.massFood.remove(eatenMassIndexes);
            massGained += eatenFoodIndexes.length * config.foodMass;
            currentPlayer.changeCellMass(cellIndex, massGained);
        }

        const partPickups = map.partLoot.collectForPlayer(currentPlayer);
        if (memoryStore && currentPlayer.activePet) {
            partPickups.forEach((pickup) => {
                const now = Date.now();
                const petId = currentPlayer.activePet.petId || currentPlayer.activePet.npcId || 'pet';
                try {
                    memoryStore.recordEvent({
                        eventId: ['l1', ghostRecorder && ghostRecorder.sessionId ? ghostRecorder.sessionId : 'session', currentPlayer.id, petId, 'player_picked_with_me', now].join(':'),
                        kind: 'player_picked_with_me',
                        eventType: 'player_picked_with_me',
                        playerId: currentPlayer.id,
                        npcId: petId,
                        sessionId: ghostRecorder && ghostRecorder.sessionId ? ghostRecorder.sessionId : null,
                        mapId: config.mapId || 'fixed-arena',
                        x: pickup.loot.x,
                        y: pickup.loot.y,
                        payload: {
                            partId: pickup.equippedPart.partId,
                            partType: pickup.equippedPart.partType,
                            sourceType: pickup.equippedPart.sourceType
                        },
                        ts: now,
                        createdAt: now
                    });
                } catch (error) {
                    console.warn('[NPC] pickup memory write failed', error.message);
                }
            });
        }
        if (ghostRecorder) {
            partPickups.forEach((pickup) => {
                const now = Date.now();
                const lootPosition = {
                    x: pickup.loot.x,
                    y: pickup.loot.y
                };

                ghostRecorder.recordItem(currentPlayer, pickup.equippedPart, pickup.loot, now);
                if (typeof ghostRecorder.recordPartEvent === 'function') {
                    ghostRecorder.recordPartEvent(currentPlayer, 'part_pickup', pickup.equippedPart, lootPosition, now);
                    ghostRecorder.recordPartEvent(currentPlayer, 'part_equipped', pickup.equippedPart, lootPosition, now);
                    if (pickup.droppedPart) {
                        ghostRecorder.recordPartEvent(currentPlayer, 'part_replaced', pickup.droppedPart, lootPosition, now);
                        ghostRecorder.recordPartEvent(currentPlayer, 'part_drop', pickup.droppedPart, lootPosition, now);
                    }
                }
            });
        }
        currentPlayer.virusSplit(cellsToSplit, config.limitSplit, config.defaultPlayerMass);
    }

    function tickGame() {
        if (ghostManager) {
            const now = Date.now();
            const roundClock = getRoundClock();
            ghostManager.tick({
                map,
                players: map.players.data,
                matchStartedAt: roundClock.startedAt,
                now
            });
            if (ghostRecorder) {
                ghostRecorder.recordPlayers(map.players.data, now);
            }
        }
        map.players.data.forEach(tickPlayer);
        map.massFood.move(config.gameWidth, config.gameHeight);

        map.players.handleCollisions(function (gotEaten, eater) {
            const cellGotEaten = map.players.getCell(gotEaten.playerIndex, gotEaten.cellIndex);
            const eaterPlayer = map.players.data[eater.playerIndex];
            const playerGotEaten = map.players.data[gotEaten.playerIndex];

            if (!cellGotEaten || !eaterPlayer || !playerGotEaten) {
                return;
            }

            if (playerGotEaten.isNpc || eaterPlayer.isNpc) {
                return;
            }

            const massGain = body.getPlayerDevourMassGain(cellGotEaten.mass, eaterPlayer);

            eaterPlayer.changeCellMass(eater.cellIndex, massGain);

            const playerDied = map.players.removeCell(gotEaten.playerIndex, gotEaten.cellIndex);
            if (!playerDied) {
                return;
            }

            const stolenPart = body.stealRandomCorePart(
                playerGotEaten,
                eaterPlayer
            );
            if (ghostRecorder) {
                const now = Date.now();
                const position = {
                    x: eaterPlayer.x,
                    y: eaterPlayer.y
                };
                if (typeof ghostRecorder.recordCombatEvent === 'function') {
                    ghostRecorder.recordCombatEvent(eaterPlayer, 'kill', playerGotEaten, position, now);
                    ghostRecorder.recordCombatEvent(playerGotEaten, 'swallowed', eaterPlayer, position, now);
                }
                if (stolenPart && typeof ghostRecorder.recordPartEvent === 'function') {
                    ghostRecorder.recordPartEvent(eaterPlayer, 'part_stolen', stolenPart, position, now, {
                        fromPlayerId: playerGotEaten.id,
                        fromPlayerName: playerGotEaten.name
                    });
                    ghostRecorder.recordPartEvent(eaterPlayer, 'part_equipped', stolenPart, position, now, {
                        fromPlayerId: playerGotEaten.id,
                        fromPlayerName: playerGotEaten.name
                    });
                }
            }

            const playerSocket = getSocket(playerGotEaten.id);
            connectionService.clearTimer(playerGotEaten.id);
            io.emit('playerDied', {name: playerGotEaten.name});
            if (playerSocket) {
                playerSocket.emit('settlement', settlement.buildSettlementSummary({
                    player: playerGotEaten,
                    endedReason: 'swallowed',
                    winnerName: eaterPlayer.name || eaterPlayer.id,
                    recordingConsent: playerGotEaten.consentToRecord !== false,
                    historyWritten: playerGotEaten.isReplayAllowed !== false
                }));
                playerSocket.emit('RIP');
            }
            map.players.removePlayerByIndex(gotEaten.playerIndex);
        });
    }

    function gameloop() {
        if (map.players.data.length > 0) {
            calculateLeaderboard();
            map.players.shrinkCells(config.massLossRate, config.defaultPlayerMass, config.minMassLoss);
        }

        map.balanceMass(config.foodMass, config.gameMass, config.maxFood, config.maxVirus);
    }

    function updateSpectator(socketId) {
        const socket = getSocket(socketId);
        if (!socket) {
            return;
        }
        const spectatorData = createSpectatorSyncData(socketId, config);
        spectatorData.ghostDebug = map.ghostDebug || null;

        socket.emit(
            'serverTellPlayerMove',
            spectatorData,
            projectPlayersForSync(map.players.data),
            map.food.data,
            map.massFood.data,
            map.viruses.data,
            map.partLoot.data,
            map.ghosts
        );

        if (leaderboardChanged) {
            sendLeaderboard(socket);
        }
    }

    function sendUpdates() {
        getSpectatorIds().forEach(updateSpectator);
        map.enumerateVisibleWorld(function (visibleWorld) {
            const syncPayload = projectVisibleWorldForSync(visibleWorld);
            syncPayload.playerData.ghostDebug = map.ghostDebug || null;
            const socket = getSocket(syncPayload.playerData.id);
            if (!socket) {
                return;
            }

            socket.emit(
                'serverTellPlayerMove',
                syncPayload.playerData,
                syncPayload.visiblePlayers,
                syncPayload.visibleFood,
                syncPayload.visibleMass,
                syncPayload.visibleViruses,
                syncPayload.visiblePartLoot,
                syncPayload.visibleGhosts
            );

            if (leaderboardChanged) {
                sendLeaderboard(socket);
            }
        });

        leaderboardChanged = false;
    }

    return {
        tickGame,
        tickPlayer,
        gameloop,
        sendUpdates
    };
}

module.exports = createGameLoopService;
module.exports.createGameLoopService = createGameLoopService;
