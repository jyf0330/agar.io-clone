'use strict';

function formatRelationshipStatus(player) {
    if (!player || typeof player.intimacy !== 'number' || typeof player.spike !== 'number' || typeof player.pollution !== 'number') {
        return '';
    }

    return [
        '<br />',
        '<span class="title">Resonance</span>',
        '<br />',
        'Intimacy: ' + player.intimacy,
        '<br />',
        'Spike: ' + player.spike,
        '<br />',
        'Pollution: ' + player.pollution
    ].join('');
}

module.exports = formatRelationshipStatus;
