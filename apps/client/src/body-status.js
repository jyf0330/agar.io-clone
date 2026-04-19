'use strict';
var i18n = require('./i18n');

const PART_LABELS = {
    HEAD: 'parts.HEAD',
    HAND: 'parts.HAND',
    FOOT: 'parts.FOOT',
    MOUTH: 'parts.MOUTH',
    HEART: 'parts.HEART',
    SPIKE: 'parts.SPIKE'
};

function formatBodyStatus(player) {
    if (!player || typeof player.bodyPartCount !== 'number') {
        return '';
    }

    const counts = player.bodyPartCounts || {};
    const summary = Object.keys(PART_LABELS)
        .filter((type) => counts[type] > 0)
        .map((type) => i18n.t(PART_LABELS[type]) + ': ' + counts[type])
        .join(', ');

    return [
        '<br />',
        '<span class="title">' + i18n.t('hud.body') + '</span>',
        '<br />',
        i18n.t('hud.bodyParts', { count: player.bodyPartCount }),
        summary ? '<br />' + summary : ''
    ].join('');
}

module.exports = formatBodyStatus;
