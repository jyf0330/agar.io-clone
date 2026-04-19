'use strict';

var avatarDraftConfig = require('./avatar-draft-config');
var avatarTemplates = require('./avatar-draft-templates');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function removeMissingPart(fullShapeData, missingPartType) {
    var shapeData = clone(fullShapeData);
    shapeData.objects = shapeData.objects.filter(function (object) {
        return object.partType !== missingPartType;
    });
    return shapeData;
}

function randomPick(items, randomFn) {
    var index = typeof randomFn === 'function'
        ? randomFn(items.length)
        : Math.floor(Math.random() * items.length);
    return items[index];
}

function buildCandidateFromTemplate(template, sourceType, missingPartType, extraMeta) {
    return {
        id: sourceType + ':' + template.id + ':' + missingPartType,
        sourceType: sourceType,
        templateId: template.id,
        baseShapeData: removeMissingPart(template.fullShapeData, missingPartType),
        fullShapeData: clone(template.fullShapeData),
        missingPartType: missingPartType,
        previewMeta: Object.assign({
            title: template.previewMeta.title,
            subtitle: template.previewMeta.subtitle
        }, extraMeta || {})
    };
}

function buildDraftCandidates(options) {
    var config = options && options.config ? options.config : avatarDraftConfig;
    var defaultTemplates = options && options.defaultTemplates ? options.defaultTemplates : avatarTemplates.getDefaultTemplates();
    var historyEntries = options && options.historyEntries ? options.historyEntries : [];
    var candidateCount = options && options.candidateCount ? options.candidateCount : config.candidateCount;
    var randomFn = options && options.randomIndex;
    var candidates = [];
    var missingPartsPool = config.defaultMissingPartsPool;
    var templateIndex = 0;

    while (candidates.length < candidateCount) {
        var useHistory = config.enableHistoryPool && historyEntries.length > 0 && candidates.length % 2 === 1;
        if (useHistory) {
            var historyEntry = historyEntries[candidates.length % historyEntries.length];
            var historyTemplate = avatarTemplates.getDefaultTemplateById(historyEntry.templateId) || defaultTemplates[templateIndex % defaultTemplates.length];
            candidates.push(buildCandidateFromTemplate(
                historyTemplate,
                'history',
                historyEntry.missingPartType || randomPick(missingPartsPool, randomFn),
                {
                    subtitleKey: 'draft.historyPick',
                    previewDataUrl: historyEntry.previewDataUrl
                }
            ));
        } else {
            var defaultTemplate = defaultTemplates[templateIndex % defaultTemplates.length];
            candidates.push(buildCandidateFromTemplate(
                defaultTemplate,
                'default',
                randomPick(missingPartsPool, randomFn)
            ));
            templateIndex += 1;
        }
    }

    return candidates;
}

module.exports = {
    buildDraftCandidates: buildDraftCandidates
};
