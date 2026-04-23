'use strict';

function escapeAttribute(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function createPaintedAvatarSvg(basePreviewDataUrl, color, strokeIndex) {
    const safeColor = color || '#FF6B9D';
    const offset = (strokeIndex || 0) % 5 * 14;
    const backgroundImage = basePreviewDataUrl ? [
        '<image',
        '  href="' + escapeAttribute(basePreviewDataUrl) + '"',
        '  x="0"',
        '  y="0"',
        '  width="320"',
        '  height="320"',
        '  preserveAspectRatio="none"',
        '/>'
    ].join('\n') : '<rect width="320" height="320" fill="rgba(255,255,255,0.01)" />';

    return [
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">',
        backgroundImage,
        '<line x1="' + (44 + offset) + '" y1="84" x2="' + (266 + offset) + '" y2="244" stroke="' + safeColor + '" stroke-width="26" stroke-linecap="round" stroke-opacity="0.3" />',
        '</svg>'
    ].join('\n');
}

function createPaintedAvatarDataUrl(basePreviewDataUrl, color, strokeIndex) {
    const svg = createPaintedAvatarSvg(basePreviewDataUrl, color, strokeIndex);
    return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
}

function decodePaintedAvatarSvg(dataUrl) {
    return Buffer.from(String(dataUrl || '').split(',')[1] || '', 'base64').toString('utf8');
}

module.exports = {
    createPaintedAvatarDataUrl: createPaintedAvatarDataUrl,
    decodePaintedAvatarSvg: decodePaintedAvatarSvg
};
