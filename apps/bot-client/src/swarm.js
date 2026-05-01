'use strict';

const {parseBotSwarmOptions, startBotSwarm} = require('./bot-swarm');

const options = parseBotSwarmOptions();
startBotSwarm(options);
