'use strict';

const {createBotClient} = require('./bot-client');

const serverUrl = process.env.BOT_SERVER_URL || process.argv[2] || 'http://127.0.0.1:3000';
const name = process.env.BOT_NAME || process.argv[3] || 'Bot_One';

const client = createBotClient({
    serverUrl,
    profile: {
        name
    }
});

client.connect();
console.log('[BOT] connecting ' + name + ' to ' + serverUrl);
