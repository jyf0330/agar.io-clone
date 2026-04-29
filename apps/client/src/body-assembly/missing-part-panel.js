'use strict';

var config = require('../data/body-assembly-parts');

function createMissingPartPanel(options) {
    var root = options.root;

    function render(state) {
        var label = config.PART_LABELS[state.missingPartType] || state.missingPartType;
        root.textContent = '缺失部位：' + label + '。从下方 3 个候选零件中选择 1 个装上。';
    }

    return {
        render: render
    };
}

module.exports = createMissingPartPanel;
