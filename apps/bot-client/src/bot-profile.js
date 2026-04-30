'use strict';

const fs = require('fs');
const path = require('path');

function resolveProfilePath(profileNameOrPath) {
    const value = profileNameOrPath || 'doudou';
    if (value.indexOf('/') > -1 || value.indexOf('\\') > -1 || value.endsWith('.json')) {
        return path.resolve(process.cwd(), value);
    }
    return path.resolve(process.cwd(), 'demo/bot-players/' + value + '.json');
}

function createCardPreview(profile) {
    const color = profile.color || '#8DD7FF';
    const label = profile.name || 'Bot';
    const svg = [
        '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
        '<rect width="128" height="128" rx="18" fill="' + color + '"/>',
        '<circle cx="64" cy="54" r="30" fill="#ffffff" opacity="0.86"/>',
        '<text x="64" y="104" font-family="Arial" font-size="14" text-anchor="middle" fill="#1f2933">' + label + '</text>',
        '</svg>'
    ].join('');
    return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

function loadBotProfile(profilePath) {
    const resolvedPath = resolveProfilePath(profilePath);
    const rawProfile = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    const profile = Object.assign({
        screenWidth: 1280,
        screenHeight: 720,
        consentToRecord: true,
        isReplayAllowed: true
    }, rawProfile);

    profile.isBot = true;
    profile.playerCardPreviewDataUrl = profile.playerCardPreviewDataUrl || createCardPreview(profile);
    return profile;
}

module.exports = {
    resolveProfilePath,
    loadBotProfile,
    createCardPreview
};
