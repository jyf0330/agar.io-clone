'use strict';
var i18n = require('./i18n');

function formatPlayerCardPreview(previewDataUrl, title) {
    var safeTitle = title || i18n.t('hud.playerCard');
    var content = previewDataUrl
        ? '<img class="player-card-preview-image" src="' + previewDataUrl + '" alt="' + safeTitle + '" />'
        : '<div class="player-card-preview-empty">' + i18n.t('hud.noCardYet') + '</div>';

    return [
        '<div class="player-card-preview">',
        '<span class="title">' + safeTitle + '</span>',
        '<br />',
        content,
        '</div>'
    ].join('');
}

module.exports = formatPlayerCardPreview;
