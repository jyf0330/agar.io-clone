'use strict';

var config = require('../data/body-assembly-parts');
var createCharacterPreview = require('./character-preview');
var createMissingPartPanel = require('./missing-part-panel');
var createPartOptionList = require('./part-option-list');
var createStatsPanel = require('./stats-panel');
var createConfirmBodyButton = require('./confirm-body-button');
var dom = require('./dom');

function randomMissingPart(randomFn) {
    var index = typeof randomFn === 'function'
        ? randomFn(config.PART_TYPES.length)
        : Math.floor(Math.random() * config.PART_TYPES.length);
    return config.PART_TYPES[index] || config.PART_TYPES[0];
}

function openDrawingMode() {}

function saveSelectedBodyPart() {}

function enterGameWithBodyConfig() {}

function createBodyAssemblyPage(options) {
    options = options || {};
    var document = options.document;
    var panelEl = document.getElementById('bodyAssemblyPanel');
    var statusEl = document.getElementById('bodyAssemblyStatus');
    var state = {
        playerType: null,
        missingPartType: null,
        selectedOption: null,
        confirmed: false
    };
    var preview = createCharacterPreview({
        document: document,
        root: document.getElementById('bodyAssemblyPreview')
    });
    var missingPartPanel = createMissingPartPanel({
        root: document.getElementById('bodyAssemblyMissingPart')
    });
    var statsPanel = createStatsPanel({
        root: document.getElementById('bodyAssemblyStats')
    });
    var optionList = createPartOptionList({
        document: document,
        root: document.getElementById('bodyAssemblyOptionList'),
        onSelect: selectOption
    });
    var confirmButton = createConfirmBodyButton({
        button: document.getElementById('bodyAssemblyConfirmButton'),
        onConfirm: confirm
    });

    function render() {
        preview.render(state);
        missingPartPanel.render(state);
        optionList.render(state);
        statsPanel.render(state);
        confirmButton.render(state);
        if (statusEl && !state.confirmed) {
            statusEl.textContent = '';
        }
    }

    function selectOption(option) {
        state.selectedOption = option;
        state.confirmed = false;
        render();
    }

    function buildConfig() {
        return config.createBodyAssemblyConfig({
            missingPartType: state.missingPartType,
            selectedOption: state.selectedOption
        });
    }

    function confirm() {
        var bodyConfig;
        if (!state.selectedOption || state.confirmed) {
            return;
        }

        state.confirmed = true;
        bodyConfig = buildConfig();
        if (typeof console !== 'undefined' && console.log) {
            console.log('[BodyAssembly]', {
                missingPartType: bodyConfig.missingPartType,
                selectedOption: bodyConfig.selectedOption.id
            });
        }
        (options.saveSelectedBodyPart || saveSelectedBodyPart)(bodyConfig);
        if (statusEl) {
            statusEl.textContent = '身体已确认';
        }
        confirmButton.render(state);
        close();
        (options.enterGameWithBodyConfig || enterGameWithBodyConfig)(bodyConfig);
    }

    function open(playerType) {
        state.playerType = playerType;
        state.missingPartType = options.randomMissingPart
            ? options.randomMissingPart()
            : randomMissingPart();
        state.selectedOption = null;
        state.confirmed = false;
        dom.addClass(panelEl, 'open');
        render();
    }

    function close() {
        dom.removeClass(panelEl, 'open');
    }

    return {
        open: open,
        close: close,
        getState: function () {
            return {
                playerType: state.playerType,
                missingPartType: state.missingPartType,
                selectedOption: state.selectedOption,
                confirmed: state.confirmed
            };
        },
        openDrawingMode: options.openDrawingMode || openDrawingMode,
        randomMissingPart: options.randomMissingPart || randomMissingPart,
        saveSelectedBodyPart: options.saveSelectedBodyPart || saveSelectedBodyPart,
        enterGameWithBodyConfig: options.enterGameWithBodyConfig || enterGameWithBodyConfig
    };
}

createBodyAssemblyPage.randomMissingPart = randomMissingPart;
createBodyAssemblyPage.openDrawingMode = openDrawingMode;
createBodyAssemblyPage.saveSelectedBodyPart = saveSelectedBodyPart;
createBodyAssemblyPage.enterGameWithBodyConfig = enterGameWithBodyConfig;

module.exports = createBodyAssemblyPage;
