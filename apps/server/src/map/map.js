"use strict";

const {isVisibleEntity} = require("../lib/entityUtils");

exports.foodUtils = require('./food');
exports.virusUtils = require('./virus');
exports.massFoodUtils = require('./massFood');
exports.partLootUtils = require('./partLoot');
exports.playerUtils = require('./player');

exports.Map = class {
    constructor(config) {
        this.config = config || {};
        this.food = new exports.foodUtils.FoodManager(config.foodMass, config.foodUniformDisposition);
        this.viruses = new exports.virusUtils.VirusManager(config.virus);
        this.massFood = new exports.massFoodUtils.MassFoodManager();
        this.partLoot = new exports.partLootUtils.PartLootManager();
        this.players = new exports.playerUtils.PlayerManager();
        this.ghosts = [];
    }

    balanceMass(foodMass, gameMass, maxFood, maxVirus) {
        const totalMass = this.food.data.length * foodMass + this.players.getTotalMass();

        const massDiff = gameMass - totalMass;
        const foodFreeCapacity = maxFood - this.food.data.length;
        const foodDiff = Math.min(parseInt(massDiff / foodMass), foodFreeCapacity);
        if (foodDiff > 0) {
            if (this.config.debugMassBalance) {
                console.debug('[DEBUG] Adding ' + foodDiff + ' food');
            }
            this.food.addNew(foodDiff);
        } else if (foodDiff && foodFreeCapacity !== maxFood) {
            if (this.config.debugMassBalance) {
                console.debug('[DEBUG] Removing ' + -foodDiff + ' food');
            }
            this.food.removeExcess(-foodDiff);
        }
        //console.debug('[DEBUG] Mass rebalanced!');

        const virusesToAdd = maxVirus - this.viruses.data.length;
        if (virusesToAdd > 0) {
            this.viruses.addNew(virusesToAdd);
        }

        if (this.config.partLoot) {
            this.partLoot.balanceWorldParts(Object.assign({
                gameWidth: this.config.gameWidth,
                gameHeight: this.config.gameHeight
            }, this.config.partLoot));
        }
    }

    getVisibleWorldForPlayer(currentPlayer) {
        return {
            player: currentPlayer,
            visibleFood: this.food.data.filter(entity => isVisibleEntity(entity, currentPlayer, false)),
            visibleViruses: this.viruses.data.filter(entity => isVisibleEntity(entity, currentPlayer)),
            visibleMass: this.massFood.data.filter(entity => isVisibleEntity(entity, currentPlayer)),
            visiblePartLoot: this.partLoot.data.filter(entity => isVisibleEntity(entity, currentPlayer)),
            visibleGhosts: this.ghosts.filter(entity => isVisibleEntity(entity, currentPlayer)),
            visiblePlayers: this.players.data.filter((player) => {
                return player.cells.some((cell) => isVisibleEntity(cell, currentPlayer));
            })
        };
    }

    enumerateVisibleWorld(callback) {
        for (let currentPlayer of this.players.data) {
            callback(this.getVisibleWorldForPlayer(currentPlayer));
        }
    }
}
