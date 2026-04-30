'use strict';

const fs = require('fs');
const path = require('path');
const bodyAssemblyParts = require('../../client/src/data/body-assembly-parts');

const LEGACY_PART_ALIASES = {
    hand: ['hand_left', 'hand_right'],
    foot: ['leg_left', 'leg_right'],
    leg: ['leg_left', 'leg_right']
};

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

function findPartById(partType, partId) {
    if (!partId) {
        return null;
    }

    const options = bodyAssemblyParts.OPTION_PARTS[partType] || [];
    const fixedPart = bodyAssemblyParts.FIXED_PARTS[partType];
    return options.concat(fixedPart ? [fixedPart] : []).find((part) => part && part.id === partId) || null;
}

function normalizeSelectedParts(selectedParts) {
    const source = selectedParts || {};
    const normalized = {};

    bodyAssemblyParts.PART_TYPES.forEach((partType) => {
        normalized[partType] = source[partType] || null;
    });

    Object.keys(LEGACY_PART_ALIASES).forEach((legacyKey) => {
        if (!source[legacyKey]) {
            return;
        }
        LEGACY_PART_ALIASES[legacyKey].forEach((partType) => {
            normalized[partType] = normalized[partType] || source[legacyKey];
        });
    });

    return normalized;
}

function createCompleteBodyAssembly(bodyAssembly) {
    const source = bodyAssembly || {};
    const selectedParts = normalizeSelectedParts(source.selectedParts);
    const firstSelectedPartType = bodyAssemblyParts.PART_TYPES.find((partType) => {
        return findPartById(partType, selectedParts[partType]);
    });
    const missingPartType = bodyAssemblyParts.PART_TYPES.indexOf(source.missingPartType) > -1
        ? source.missingPartType
        : (firstSelectedPartType || bodyAssemblyParts.PART_TYPES[0]);
    const selectedOption = findPartById(missingPartType, selectedParts[missingPartType])
        || bodyAssemblyParts.OPTION_PARTS[missingPartType][0];

    const completeAssembly = bodyAssemblyParts.createBodyAssemblyConfig({
        missingPartType,
        selectedOption
    });

    bodyAssemblyParts.PART_TYPES.forEach((partType) => {
        const selectedPart = findPartById(partType, selectedParts[partType]);
        if (selectedPart) {
            completeAssembly.layers[partType] = selectedPart;
        }
    });

    completeAssembly.selectedParts = bodyAssemblyParts.PART_TYPES.reduce((parts, partType) => {
        parts[partType] = completeAssembly.layers[partType].id;
        return parts;
    }, {});

    return completeAssembly;
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
    profile.bodyAssembly = createCompleteBodyAssembly(profile.bodyAssembly);
    profile.playerCardPreviewDataUrl = profile.playerCardPreviewDataUrl || createCardPreview(profile);
    return profile;
}

module.exports = {
    resolveProfilePath,
    loadBotProfile,
    createCardPreview,
    createCompleteBodyAssembly
};
