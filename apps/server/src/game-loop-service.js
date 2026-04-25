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

const PET_SUGGESTION_ACCEPT_WINDOW_MS = 30000;

function createGameLoopService(options) {
    const config = options.config;
    const map = options.map;
    const io = options.io;
    const connectionService = options.connectionService;
    const ghostManager = options.ghostManager;
    const ghostRecorder = options.ghostRecorder;
    const memoryStore = options.memoryStore;
    const onRoundEnd = typeof options.onRoundEnd === 'function' ? options.onRoundEnd : null;
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

    function getRecorderSessionId() {
        return ghostRecorder && ghostRecorder.sessionId ? ghostRecorder.sessionId : null;
    }

    function getPetId(player) {
        return player && player.activePet ? player.activePet.petId || player.activePet.npcId || 'pet' : 'pet';
    }

    function findRecentPartSuggestion(player, pickedPart, now) {
        if (!memoryStore || typeof memoryStore.listEvents !== 'function' || !player || !player.activePet || !pickedPart) {
            return null;
        }

        const petId = getPetId(player);
        const sessionId = getRecorderSessionId();
        const filters = {
            eventType: 'pet_suggested_part',
            playerId: player.id,
            npcId: petId,
            limit: 10
        };
        if (sessionId) {
            filters.sessionId = sessionId;
        }

        try {
            const events = memoryStore.listEvents(filters) || [];
            const pickedType = pickedPart.partType || pickedPart.type;
            for (let index = events.length - 1; index >= 0; index -= 1) {
                const event = events[index] || {};
                const payload = event.payload || {};
                const suggestedPart = payload.suggestedPart || {};
                const suggestedType = suggestedPart.partType || suggestedPart.type;
                const eventTs = typeof event.ts === 'number' ? event.ts : 0;
                if (suggestedType === pickedType && now - eventTs <= PET_SUGGESTION_ACCEPT_WINDOW_MS) {
                    return event;
                }
            }
        } catch (error) {
            console.warn('[NPC] suggestion lookup failed', error.message);
        }

        return null;
    }

    function recordAcceptedPetSuggestion(player, pickup, suggestion, now) {
        if (!memoryStore || typeof memoryStore.recordEvent !== 'function' || !suggestion) {
            return;
        }

        const petId = getPetId(player);
        try {
            memoryStore.recordEvent({
                eventId: ['l1', getRecorderSessionId() || 'session', player.id, petId, 'player_accepted_pet_suggestion', now].join(':'),
                kind: 'player_accepted_pet_suggestion',
                eventType: 'player_accepted_pet_suggestion',
                playerId: player.id,
                npcId: petId,
                sessionId: getRecorderSessionId(),
                mapId: config.mapId || 'fixed-arena',
                x: pickup.loot.x,
                y: pickup.loot.y,
                payload: {
                    suggestionEventId: suggestion.eventId || '',
                    partId: pickup.equippedPart.partId,
                    partType: pickup.equippedPart.partType,
                    sourceType: pickup.equippedPart.sourceType
                },
                ts: now,
                createdAt: now
            });
        } catch (error) {
            console.warn('[NPC] accepted suggestion memory write failed', error.message);
        }
    }

    function isRoundExpired(now) {
        const roundClock = getRoundClock() || {};
        const startedAt = typeof roundClock.startedAt === 'number' ? roundClock.startedAt : 0;
        const durationMs = typeof roundClock.durationMs === 'number' ? roundClock.durationMs : 0;

        return durationMs > 0 && now - startedAt >= durationMs;
    }

    function settlePlayerGameEnd(player, endedReason, winnerName) {
        if (!player || player.isNpc) {
            return;
        }

        const playerSocket = getSocket(player.id);
        connectionService.clearTimer(player.id);
        if (playerSocket) {
            playerSocket.emit('settlement', settlement.buildSettlementSummary({
                player,
                endedReason: endedReason,
                winnerName: winnerName || '',
                recordingConsent: player.consentToRecord !== false,
                historyWritten: player.isReplayAllowed !== false
            }));
            playerSocket.emit('RIP');
        }
        map.players.removePlayerByID(player.id);
    }

    function notifyRoundEnd(activeHumans, context) {
        if (activeHumans.length && onRoundEnd) {
            try {
                onRoundEnd(activeHumans, Object.assign({
                    forceMemoryFinalize: true
                }, context || {}));
            } catch (error) {
                console.warn('[V5] round end hook failed', error.message);
            }
        }
    }

    function settleExpiredRound(now) {
        if (!isRoundExpired(now)) {
            return false;
        }

        const activeHumans = map.players.data.filter((player) => player && !player.isNpc);
        notifyRoundEnd(activeHumans, {
            endedReason: 'round_end'
        });
        activeHumans.forEach((player) => settlePlayerGameEnd(player, 'round_end'));
        return activeHumans.length > 0;
    }

    function settleBodyCompletion() {
        const winner = map.players.data.find((player) => {
            return player && !player.isNpc && player.materializationStage === 'OVERREAL';
        });
        if (!winner) {
            return false;
        }

        const activeHumans = map.players.data.filter((player) => player && !player.isNpc);
        const winnerName = winner.name || winner.id;
        notifyRoundEnd(activeHumans, {
            endedReason: 'body_complete',
            winnerName: winnerName
        });
        activeHumans.forEach((player) => settlePlayerGameEnd(player, 'body_complete', winnerName));
        return activeHumans.length > 0;
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
                const petId = getPetId(currentPlayer);
                const suggestion = findRecentPartSuggestion(currentPlayer, pickup.equippedPart, now);
                try {
                    memoryStore.recordEvent({
                        eventId: ['l1', getRecorderSessionId() || 'session', currentPlayer.id, petId, 'player_picked_with_me', now].join(':'),
                        kind: 'player_picked_with_me',
                        eventType: 'player_picked_with_me',
                        playerId: currentPlayer.id,
                        npcId: petId,
                        sessionId: getRecorderSessionId(),
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
                recordAcceptedPetSuggestion(currentPlayer, pickup, suggestion, now);
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
        const now = Date.now();
        if (ghostManager) {
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
        if (settleExpiredRound(now)) {
            return;
        }
        map.players.data.forEach(tickPlayer);
        if (settleBodyCompletion()) {
            return;
        }
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

        settleBodyCompletion();
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
