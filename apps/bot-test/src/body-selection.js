'use strict';

const bodyAssemblyParts = require('../../client/src/data/body-assembly-parts');
const {createCardPreview} = require('../../bot-client/src/bot-profile');
const {BODY_PART_CHOICES} = require('./constants');
const {pickRandom} = require('./random');

function selectBodyPart(random) {
    const choice = pickRandom(BODY_PART_CHOICES, random) || BODY_PART_CHOICES[0];
    const selectedOption = (bodyAssemblyParts.OPTION_PARTS[choice.partType] || [])
        .find((part) => part.id === choice.partId);
    if (!selectedOption) {
        throw new Error('Body option not found: ' + choice.partId);
    }

    return {
        choice,
        bodyAssembly: bodyAssemblyParts.createBodyAssemblyConfig({
            missingPartType: choice.partType,
            selectedOption: selectedOption
        }),
        bodySignature: {
            slotType: 'HAND',
            templateId: 'hand-open',
            tier: 'bot-test',
            selectedLabel: choice.label
        }
    };
}

function buildEntryPayload(options) {
    const settings = options || {};
    const selection = settings.selection || selectBodyPart(settings.random);
    const name = settings.name || settings.botId || 'Bot_Test';

    return {
        name,
        screenWidth: settings.screenWidth || 1280,
        screenHeight: settings.screenHeight || 720,
        target: settings.target || {x: 0, y: 0},
        playerCardPreviewDataUrl: settings.playerCardPreviewDataUrl || createCardPreview({
            name,
            color: settings.color || '#8DD7FF'
        }),
        bodyAssembly: selection.bodyAssembly,
        bodySignature: selection.bodySignature,
        consentToRecord: true,
        isReplayAllowed: true,
        isBot: true
    };
}

module.exports = {
    selectBodyPart,
    buildEntryPayload
};
