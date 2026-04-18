'use strict';

var playerCardStorage = require('./player-card-storage');

var FABRIC_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/fabric@6.7.1/dist/index.min.js';

var fabricLoadPromise;

function loadFabric() {
    if (window.fabric) {
        return Promise.resolve(window.fabric);
    }

    if (fabricLoadPromise) {
        return fabricLoadPromise;
    }

    fabricLoadPromise = new Promise(function (resolve, reject) {
        var script = document.createElement('script');
        script.src = FABRIC_SCRIPT_URL;
        script.async = true;
        script.onload = function () {
            resolve(window.fabric);
        };
        script.onerror = function () {
            reject(new Error('Failed to load Fabric.js'));
        };
        document.head.appendChild(script);
    });

    return fabricLoadPromise;
}

function createPlayerCardEditor(options) {
    var state = {
        canvas: null,
        fabric: null,
        history: [],
        activeTool: 'draw',
        loading: false
    };

    function setPanelMessage(message) {
        if (options.messageEl) {
            options.messageEl.textContent = message || '';
        }
    }

    function pushHistory() {
        if (!state.canvas) {
            return;
        }

        state.history.push(JSON.stringify(state.canvas.toJSON()));
        if (state.history.length > 30) {
            state.history.shift();
        }
    }

    function restoreFromHistory(serialized) {
        if (!state.canvas) {
            return Promise.resolve();
        }

        state.loading = true;
        return state.canvas.loadFromJSON(JSON.parse(serialized)).then(function () {
            state.canvas.backgroundColor = '#ffffff';
            state.canvas.requestRenderAll();
            state.loading = false;
        });
    }

    function updateBrush() {
        if (!state.canvas || !state.fabric) {
            return;
        }

        if (state.activeTool === 'erase') {
            if (state.fabric.EraserBrush) {
                state.canvas.freeDrawingBrush = new state.fabric.EraserBrush(state.canvas);
            } else {
                state.canvas.freeDrawingBrush = new state.fabric.PencilBrush(state.canvas);
                state.canvas.freeDrawingBrush.color = '#ffffff';
            }
        } else {
            state.canvas.freeDrawingBrush = new state.fabric.PencilBrush(state.canvas);
            state.canvas.freeDrawingBrush.color = options.colorInput.value;
        }

        state.canvas.freeDrawingBrush.width = parseInt(options.sizeInput.value, 10);
    }

    function loadSavedState() {
        var savedCard = playerCardStorage.loadPlayerCard();
        if (!savedCard || !savedCard.canvasJson) {
            state.canvas.backgroundColor = '#ffffff';
            state.canvas.requestRenderAll();
            state.history = [];
            pushHistory();
            return Promise.resolve();
        }

        return state.canvas.loadFromJSON(savedCard.canvasJson).then(function () {
            state.canvas.backgroundColor = '#ffffff';
            state.canvas.requestRenderAll();
            state.history = [];
            pushHistory();
        });
    }

    function ensureCanvas() {
        if (state.canvas) {
            return Promise.resolve(state.canvas);
        }

        return loadFabric().then(function (fabric) {
            state.fabric = fabric;
            state.canvas = new fabric.Canvas(options.canvasId, {
                isDrawingMode: true,
                backgroundColor: '#ffffff',
                width: 320,
                height: 220,
                selection: false
            });

            state.canvas.on('path:created', function () {
                if (!state.loading) {
                    pushHistory();
                }
            });

            options.colorInput.addEventListener('input', updateBrush);
            options.sizeInput.addEventListener('input', updateBrush);
            updateBrush();

            return loadSavedState().then(function () {
                return state.canvas;
            });
        });
    }

    function open() {
        options.panelEl.classList.add('open');
        setPanelMessage('Loading drawing tools...');

        return ensureCanvas().then(function () {
            updateBrush();
            setPanelMessage('');
        }).catch(function () {
            setPanelMessage('Failed to load drawing tools.');
        });
    }

    function close() {
        options.panelEl.classList.remove('open');
        setPanelMessage('');
    }

    function setTool(tool) {
        state.activeTool = tool;
        updateBrush();
        options.drawButton.classList.toggle('active', tool === 'draw');
        options.eraseButton.classList.toggle('active', tool === 'erase');
    }

    function undo() {
        if (state.history.length < 2) {
            return;
        }

        state.history.pop();
        restoreFromHistory(state.history[state.history.length - 1]);
    }

    function clear() {
        if (!state.canvas) {
            return;
        }

        state.canvas.clear();
        state.canvas.backgroundColor = '#ffffff';
        state.canvas.requestRenderAll();
        pushHistory();
    }

    function save() {
        if (!state.canvas) {
            return;
        }

        var payload = {
            previewDataUrl: state.canvas.toDataURL({
                format: 'png',
                multiplier: 1
            }),
            canvasJson: state.canvas.toJSON()
        };

        playerCardStorage.savePlayerCard(payload);
        if (options.onSave) {
            options.onSave(payload);
        }
        setPanelMessage('Card saved.');
    }

    options.openButton.addEventListener('click', function () {
        open();
    });
    options.closeButton.addEventListener('click', function () {
        close();
    });
    options.drawButton.addEventListener('click', function () {
        setTool('draw');
    });
    options.eraseButton.addEventListener('click', function () {
        setTool('erase');
    });
    options.undoButton.addEventListener('click', function () {
        undo();
    });
    options.clearButton.addEventListener('click', function () {
        clear();
    });
    options.saveButton.addEventListener('click', function () {
        save();
    });

    setTool('draw');

    return {
        open: open,
        close: close
    };
}

module.exports = createPlayerCardEditor;
