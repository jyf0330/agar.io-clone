'use strict';

const {parseBotSwarmOptions, startBotSwarm} = require('./bot-swarm');

const options = parseBotSwarmOptions();
const clients = startBotSwarm(options);

function disconnectClients() {
    clients.forEach((client) => {
        if (client && typeof client.disconnect === 'function') {
            client.disconnect();
        }
    });
}

process.once('SIGINT', disconnectClients);
process.once('SIGTERM', disconnectClients);
