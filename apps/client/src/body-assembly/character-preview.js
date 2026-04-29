'use strict';

var config = require('../data/body-assembly-parts');
var dom = require('./dom');

function formatFallbackText(partType, state, part) {
    var label = config.PART_LABELS[partType] || partType;
    if (state === 'missing') {
        return label + '\n缺失 ?';
    }
    return label + '\n' + ((part && part.name) || '占位图');
}

function createPartLayer(document, partType, part, state) {
    var anchor = config.PART_ANCHORS[partType];
    var layer = document.createElement('div');

    layer.className = 'body-assembly-preview-part body-assembly-preview-part-' + partType;
    layer.setAttribute('data-part-type', partType);
    layer.style.left = anchor.x / 10.24 + '%';
    layer.style.top = anchor.y / 10.24 + '%';
    layer.style.zIndex = String(anchor.zIndex);

    if (state === 'missing') {
        layer.className += ' is-missing';
        layer.textContent = '?';
        return layer;
    }

    if (state === 'selected') {
        layer.className += ' is-selected';
    }
    layer.appendChild(dom.createImageWithFallback(
        document,
        part,
        formatFallbackText(partType, state, part)
    ));
    return layer;
}

function createCharacterPreview(options) {
    var document = options.document;
    var root = options.root;

    function render(state) {
        dom.clearElement(root);
        config.PART_TYPES.forEach(function (partType) {
            var layer;
            if (partType === state.missingPartType) {
                if (state.selectedOption) {
                    layer = createPartLayer(document, partType, state.selectedOption, 'selected');
                } else {
                    layer = createPartLayer(document, partType, null, 'missing');
                }
            } else {
                layer = createPartLayer(document, partType, config.FIXED_PARTS[partType], 'fixed');
            }
            root.appendChild(layer);
        });
    }

    return {
        render: render
    };
}

module.exports = createCharacterPreview;
