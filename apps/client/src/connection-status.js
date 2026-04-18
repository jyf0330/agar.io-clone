'use strict';

function formatConnectionStatus(player) {
    if (!player || !player.connectionStatus) {
        return '';
    }

    return [
        '<br />',
        '<span class="title">Connection</span>',
        '<br />',
        'Status: ' + player.connectionStatus,
        player.connectionTargetName ? '<br />Target: ' + player.connectionTargetName : ''
    ].join('');
}

module.exports = formatConnectionStatus;
