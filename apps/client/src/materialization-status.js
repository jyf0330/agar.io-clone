'use strict';
var i18n = require('./i18n');

function formatMaterializationStatus(player) {
    if (!player || typeof player.materialization !== 'number' || !player.materializationStage) {
        return '';
    }

    return [
        '<br />',
        '<span class="title">' + i18n.t('hud.materialization') + '</span>',
        '<br />',
        i18n.t('hud.materializationValue', { value: player.materialization }),
        '<br />',
        i18n.t('hud.materializationStage', { stage: player.materializationStage })
    ].join('');
}

module.exports = formatMaterializationStatus;
