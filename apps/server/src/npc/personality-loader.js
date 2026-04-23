'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const skeletonAssetPaths = {
    'skeleton-a-doll': path.resolve(process.cwd(), 'demo/assets/skeleton-bases/skeleton-a-doll.png'),
    'skeleton-b-blob': path.resolve(process.cwd(), 'demo/assets/skeleton-bases/skeleton-b-blob.png'),
    'skeleton-c-ghost': path.resolve(process.cwd(), 'demo/assets/skeleton-bases/skeleton-c-ghost.png'),
    'skeleton-d-robot': path.resolve(process.cwd(), 'demo/assets/skeleton-bases/skeleton-d-robot.png'),
    'skeleton-e-bean': path.resolve(process.cwd(), 'demo/assets/skeleton-bases/skeleton-e-bean.png'),
    'skeleton-f-turtle': path.resolve(process.cwd(), 'demo/assets/skeleton-bases/skeleton-f-turtle.png')
};

function formatAnchors(anchors) {
    const safeAnchors = anchors || {};

    return [
        'anchors:',
        '  facts:',
        ...(safeAnchors.facts || []).map((line) => '    - "' + line + '"'),
        '  catchphrases:',
        ...(safeAnchors.catchphrases || []).map((line) => '    - "' + line + '"'),
        '  taboos:',
        ...(safeAnchors.taboos || []).map((line) => '    - "' + line + '"')
    ].join('\n');
}

function extractAnchorsText(rawText, parsed) {
    const match = rawText.match(/^anchors:\n[\s\S]*?(?=^behavior:)/m);
    if (match) {
        return match[0].trim();
    }

    return formatAnchors(parsed.anchors);
}

function assertCardShape(card, filePath) {
    const required = ['id', 'name', 'skeleton', 'color', 'archetype', 'anchors', 'behavior', 'relationship_schema'];
    const missing = required.filter((key) => !card || card[key] == null);

    if (missing.length) {
        throw new Error('Invalid personality card at ' + filePath + ': missing ' + missing.join(', '));
    }
}

function resolveSkeletonPreviewDataUrl(skeletonKey) {
    const assetPath = skeletonAssetPaths[skeletonKey];
    if (!assetPath || !fs.existsSync(assetPath)) {
        return null;
    }

    return 'data:image/png;base64,' + fs.readFileSync(assetPath).toString('base64');
}

function loadPersonalityCard(filePath) {
    const rawText = fs.readFileSync(filePath, 'utf8');
    const parsed = YAML.parse(rawText);
    assertCardShape(parsed, filePath);

    parsed.filePath = filePath;
    parsed.anchorsText = extractAnchorsText(rawText, parsed);
    parsed.previewDataUrl = resolveSkeletonPreviewDataUrl(parsed.skeleton);

    return parsed;
}

module.exports = {
    loadPersonalityCard: loadPersonalityCard
};
