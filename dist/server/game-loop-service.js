'use strict';

const SAT = require('sat');
const body = require('./body');
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
    if (currentPlayer.lastHeartbeat < new Date().getTime() - config.maxHeartbeatInterval) {
      if (socket) {
        socket.emit('kick', 'Last heartbeat received over ' + config.maxHeartbeatInterval + ' ago.');
        socket.disconnect();
      }
      return;
    }
    currentPlayer.move(config.slowBase, config.gameWidth, config.gameHeight, initMassLog);
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
    currentPlayer.virusSplit(cellsToSplit, config.limitSplit, config.defaultPlayerMass);
  }
  function tickGame() {
    map.players.data.forEach(tickPlayer);
    map.massFood.move(config.gameWidth, config.gameHeight);
    map.players.handleCollisions(function (gotEaten, eater) {
      const cellGotEaten = map.players.getCell(gotEaten.playerIndex, gotEaten.cellIndex);
      const eaterPlayer = map.players.data[eater.playerIndex];
      const massGain = body.getPlayerDevourMassGain(cellGotEaten.mass, eaterPlayer);
      eaterPlayer.changeCellMass(eater.cellIndex, massGain);
      const playerDied = map.players.removeCell(gotEaten.playerIndex, gotEaten.cellIndex);
      if (!playerDied) {
        return;
      }
      body.stealRandomCorePart(map.players.data[gotEaten.playerIndex], eaterPlayer);
      const playerGotEaten = map.players.data[gotEaten.playerIndex];
      const playerSocket = getSocket(playerGotEaten.id);
      connectionService.clearTimer(playerGotEaten.id);
      io.emit('playerDied', {
        name: playerGotEaten.name
      });
      if (playerSocket) {
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
    socket.emit('serverTellPlayerMove', createSpectatorSyncData(socketId, config), projectPlayersForSync(map.players.data), map.food.data, map.massFood.data, map.viruses.data);
    if (leaderboardChanged) {
      sendLeaderboard(socket);
    }
  }
  function sendUpdates() {
    getSpectatorIds().forEach(updateSpectator);
    map.enumerateVisibleWorld(function (visibleWorld) {
      const syncPayload = projectVisibleWorldForSync(visibleWorld);
      const socket = getSocket(syncPayload.playerData.id);
      if (!socket) {
        return;
      }
      socket.emit('serverTellPlayerMove', syncPayload.playerData, syncPayload.visiblePlayers, syncPayload.visibleFood, syncPayload.visibleMass, syncPayload.visibleViruses);
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