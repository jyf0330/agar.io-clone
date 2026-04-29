'use strict';

var config = require('../data/body-assembly-parts');
var dom = require('./dom');
var createPartOptionCard = require('./part-option-card');

function createPartOptionList(options) {
    var document = options.document;
    var root = options.root;
    var onSelect = options.onSelect;

    function render(state) {
        var optionsForPart = config.OPTION_PARTS[state.missingPartType] || [];

        dom.clearElement(root);
        optionsForPart.forEach(function (option) {
            root.appendChild(createPartOptionCard({
                document: document,
                option: option,
                partType: state.missingPartType,
                selected: state.selectedOption && state.selectedOption.id === option.id,
                onSelect: onSelect
            }));
        });
    }

    return {
        render: render
    };
}

module.exports = createPartOptionList;
