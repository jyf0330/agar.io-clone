'use strict';

const {createBotClient, DEFAULT_SERVER_URL} = require('./bot-client');
const {loadBotProfile} = require('./bot-profile');

const DEFAULT_PROFILE_NAMES = ['doudou', 'mochi'];
const DEFAULT_BOT_COUNT = 3;
const MAX_BOT_COUNT = 12;

function parsePositiveInteger(value, fallback) {
    const parsed = parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return Math.min(parsed, MAX_BOT_COUNT);
}

function parseProfileNames(value) {
    const names = String(value || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    return names.length ? names : DEFAULT_PROFILE_NAMES.slice();
}

function titleCaseProfileName(name) {
    const value = String(name || 'Bot');
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizeBaseName(name) {
    return String(name || 'Bot')
        .split('_')
        .map(titleCaseProfileName)
        .join('_');
}

function buildBotProfiles(options) {
    const settings = options || {};
    const count = parsePositiveInteger(settings.count, DEFAULT_BOT_COUNT);
    const profileNames = Array.isArray(settings.profileNames) && settings.profileNames.length
        ? settings.profileNames
        : DEFAULT_PROFILE_NAMES;
    const loadProfile = settings.loadProfile || loadBotProfile;
    const profiles = [];

    for (let index = 0; index < count; index += 1) {
        const profileName = profileNames[index % profileNames.length];
        const profile = Object.assign({}, loadProfile(profileName));
        const baseName = normalizeBaseName(profile.name || (titleCaseProfileName(profileName) + '_Bot'));
        profile.name = baseName + '_' + (index + 1);
        profiles.push(profile);
    }

    return profiles;
}

function parseBotSwarmOptions(input) {
    const safeInput = input || {};
    const env = safeInput.env || process.env;
    const argv = safeInput.argv || process.argv.slice(2);
    const serverUrl = env.BOT_SERVER_URL || argv[0] || DEFAULT_SERVER_URL;
    const count = parsePositiveInteger(env.BOT_COUNT || argv[1], DEFAULT_BOT_COUNT);
    const profileNames = parseProfileNames(env.BOT_PROFILES || env.BOT_PROFILE || argv[2]);

    return {
        serverUrl,
        count,
        profileNames
    };
}

function startBotSwarm(options) {
    const settings = options || {};
    const logger = settings.logger || console;
    const createClient = settings.createClient || createBotClient;
    const profiles = buildBotProfiles(settings);

    return profiles.map((profile) => {
        const client = createClient({
            serverUrl: settings.serverUrl || DEFAULT_SERVER_URL,
            profile: profile
        });
        if (logger && typeof logger.log === 'function') {
            logger.log('[BOT] connecting ' + profile.name + ' to ' + (settings.serverUrl || DEFAULT_SERVER_URL));
        }
        client.connect();
        return client;
    });
}

module.exports = {
    DEFAULT_BOT_COUNT,
    DEFAULT_PROFILE_NAMES,
    MAX_BOT_COUNT,
    buildBotProfiles,
    parseBotSwarmOptions,
    parseProfileNames,
    startBotSwarm
};
