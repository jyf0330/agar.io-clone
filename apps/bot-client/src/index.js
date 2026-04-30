'use strict';

const {createBotClient} = require('./bot-client');
const {loadBotProfile} = require('./bot-profile');

const serverUrl = process.env.BOT_SERVER_URL || process.argv[2] || 'http://127.0.0.1:3000';
const profileName = process.env.BOT_PROFILE || process.argv[3] || 'doudou';
const profile = loadBotProfile(profileName);
if (process.env.BOT_NAME) {
    profile.name = process.env.BOT_NAME;
}

const client = createBotClient({
    serverUrl,
    profile
});

client.connect();
console.log('[BOT] connecting ' + profile.name + ' to ' + serverUrl);
