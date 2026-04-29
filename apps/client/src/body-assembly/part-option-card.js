'use strict';

var config = require('../data/body-assembly-parts');
var dom = require('./dom');

function formatStats(stats) {
    return Object.keys(stats || {}).map(function (key) {
        return key + ' +' + stats[key];
    }).join(' / ');
}

function createPartOptionCard(options) {
    var document = options.document;
    var option = options.option;
    var partType = options.partType;
    var selected = options.selected;
    var onSelect = options.onSelect;
    var button = document.createElement('button');
    var title = document.createElement('strong');
    var meta = document.createElement('span');
    var description = document.createElement('span');

    button.type = 'button';
    button.className = 'body-assembly-option-card' + (selected ? ' is-selected' : '');
    button.setAttribute('data-part-type', partType);
    button.setAttribute('data-option-id', option.id);
    button.appendChild(dom.createImageWithFallback(
        document,
        option,
        (config.PART_LABELS[partType] || partType) + '\n候选'
    ));

    title.className = 'body-assembly-option-title';
    title.textContent = option.name;
    meta.className = 'body-assembly-option-stats';
    meta.textContent = formatStats(option.stats);
    description.className = 'body-assembly-option-description';
    description.textContent = option.description || '临时文字描述：这张图先用于确认拼图位置和风格。';
    button.appendChild(title);
    button.appendChild(meta);
    button.appendChild(description);
    button.addEventListener('click', function () {
        onSelect(option);
    });

    return button;
}

module.exports = createPartOptionCard;
