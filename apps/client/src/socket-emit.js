'use strict';

function canEmit(socket) {
    return Boolean(socket && socket.connected);
}

function emitIfReady(socket, eventName, payload) {
    if (!canEmit(socket)) {
        return false;
    }

    if (typeof payload === 'undefined') {
        socket.emit(eventName);
    } else {
        socket.emit(eventName, payload);
    }

    return true;
}

module.exports = {
    canEmit,
    emitIfReady
};
