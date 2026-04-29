'use strict';

function formatStats(stats) {
    var keys = Object.keys(stats || {});
    if (!keys.length) {
        return '暂无属性变化';
    }
    return keys.map(function (key) {
        return key + ' +' + stats[key];
    }).join('，');
}

function createStatsPanel(options) {
    var root = options.root;

    function render(state) {
        if (!state.selectedOption) {
            root.textContent = '选择候选零件后显示属性变化。';
            return;
        }
        root.textContent = state.selectedOption.name + '：' + formatStats(state.selectedOption.stats) + '。' +
            (state.selectedOption.description || '先用临时描述和占位图确认拼接效果。');
    }

    return {
        render: render
    };
}

module.exports = createStatsPanel;
