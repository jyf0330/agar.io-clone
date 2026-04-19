'use strict';
var i18n = require('./i18n');

function formatConnectionStatus(player) {
    if (!player || !player.connectionStatus) {
        return '';
    }

    return [
        '<br />',
        '<span class="title">' + i18n.t('hud.connection') + '</span>',
        '<br />',
        i18n.t('hud.connectionStatus', { status: player.connectionStatus }),
        player.connectionTargetName ? '<br />' + i18n.t('hud.connectionTarget', { target: player.connectionTargetName }) : ''
    ].join('');
}

module.exports = formatConnectionStatus;
