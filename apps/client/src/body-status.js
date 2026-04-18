'use strict';

const PART_LABELS = {
    HEAD: 'Head',
    HAND: 'Hand',
    FOOT: 'Foot',
    MOUTH: 'Mouth',
    HEART: 'Heart',
    SPIKE: 'Spike'
};

function formatBodyStatus(player) {
    if (!player || typeof player.bodyPartCount !== 'number') {
        return '';
    }

    const counts = player.bodyPartCounts || {};
    const summary = Object.keys(PART_LABELS)
        .filter((type) => counts[type] > 0)
        .map((type) => PART_LABELS[type] + ': ' + counts[type])
        .join(', ');

    return [
        '<br />',
        '<span class="title">Body</span>',
        '<br />',
        'Parts: ' + player.bodyPartCount,
        summary ? '<br />' + summary : ''
    ].join('');
}

module.exports = formatBodyStatus;
