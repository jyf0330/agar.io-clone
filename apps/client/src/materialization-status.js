'use strict';

function formatMaterializationStatus(player) {
    if (!player || typeof player.materialization !== 'number' || !player.materializationStage) {
        return '';
    }

    return [
        '<br />',
        '<span class="title">Materialization</span>',
        '<br />',
        'Materialization: ' + player.materialization,
        '<br />',
        'Stage: ' + player.materializationStage
    ].join('');
}

module.exports = formatMaterializationStatus;
