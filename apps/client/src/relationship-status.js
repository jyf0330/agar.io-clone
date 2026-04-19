'use strict';
var i18n = require('./i18n');

function formatRelationshipStatus(player) {
    if (!player || typeof player.intimacy !== 'number' || typeof player.spike !== 'number' || typeof player.pollution !== 'number') {
        return '';
    }

    return [
        '<br />',
        '<span class="title">' + i18n.t('hud.resonance') + '</span>',
        '<br />',
        i18n.t('hud.intimacy', { value: player.intimacy }),
        '<br />',
        i18n.t('hud.spike', { value: player.spike }),
        '<br />',
        i18n.t('hud.pollution', { value: player.pollution })
    ].join('');
}

module.exports = formatRelationshipStatus;
