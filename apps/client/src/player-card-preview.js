'use strict';

function formatPlayerCardPreview(previewDataUrl, title) {
    var safeTitle = title || 'Player Card';
    var content = previewDataUrl
        ? '<img class="player-card-preview-image" src="' + previewDataUrl + '" alt="' + safeTitle + '" />'
        : '<div class="player-card-preview-empty">No card yet</div>';

    return [
        '<div class="player-card-preview">',
        '<span class="title">' + safeTitle + '</span>',
        '<br />',
        content,
        '</div>'
    ].join('');
}

module.exports = formatPlayerCardPreview;
