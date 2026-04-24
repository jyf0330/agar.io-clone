'use strict';
var i18n = require('./i18n');

function formatRelationshipStatus(player) {
    if (!player || typeof player.intimacy !== 'number' || typeof player.spike !== 'number' || typeof player.pollution !== 'number') {
        return '';
    }

    var rows = [
        '<br />',
        '<span class="title">' + i18n.t('hud.resonance') + '</span>',
        '<br />',
        i18n.t('hud.intimacy', { value: player.intimacy }),
        '<br />',
        i18n.t('hud.spike', { value: player.spike }),
        '<br />',
        i18n.t('hud.pollution', { value: player.pollution })
    ];
    if (Array.isArray(player.npcRelationships) && player.npcRelationships.length) {
        rows.push('<br />');
        rows.push('<span class="title">' + i18n.t('hud.npcRelationships') + '</span>');
        player.npcRelationships.forEach(function (entry) {
            rows.push('<br />');
            rows.push(i18n.t('hud.npcRelationshipValue', {
                name: entry.npcName || entry.npcId,
                value: entry.relationshipValue
            }));
        });
    }

    return rows.join('');
}

module.exports = formatRelationshipStatus;
