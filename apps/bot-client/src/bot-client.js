'use strict';

const socketIoClient = require('socket.io-client');

const DEFAULT_SERVER_URL = 'http://127.0.0.1:3000';
const DEFAULT_PROFILE = {
    name: 'Bot_One',
    screenWidth: 1280,
    screenHeight: 720,
    consentToRecord: true,
    isReplayAllowed: true
};

function buildEntryPayload(profile) {
    return Object.assign({}, DEFAULT_PROFILE, profile || {}, {
        isBot: true,
        consentToRecord: profile && profile.consentToRecord === false ? false : true,
        isReplayAllowed: profile && profile.isReplayAllowed === false ? false : true
    });
}

function createBotClient(options) {
    const settings = options || {};
    const state = {
        socket: null,
        player: null,
        game: null
    };
    const ioFactory = settings.ioFactory || socketIoClient;
    const serverUrl = settings.serverUrl || DEFAULT_SERVER_URL;
    const profile = Object.assign({}, settings.profile || {});

    function connect() {
        const socket = ioFactory(serverUrl, {
            query: {
                type: 'player'
            }
        });
        state.socket = socket;

        socket.on('connect', function () {
            socket.emit('gotit', buildEntryPayload(profile));
        });

        socket.on('welcome', function (player, game) {
            state.player = player || null;
            state.game = game || null;
        });

        return socket;
    }

    function getState() {
        return Object.assign({}, state);
    }

    return {
        connect,
        getState
    };
}

module.exports = {
    DEFAULT_SERVER_URL,
    buildEntryPayload,
    createBotClient
};
