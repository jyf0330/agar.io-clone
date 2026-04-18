'use strict';

var playerCardStorage = require('./player-card-storage');
var playerCardHistory = require('./player-card-history');

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
        history: playerCardHistory.createHistoryState(50),
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

        state.history = playerCardHistory.pushSnapshot(
            state.history,
            JSON.stringify(state.canvas.toJSON())
        );
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

        state.canvas.isDrawingMode = state.activeTool === 'draw' || state.activeTool === 'erase';

        if (!state.canvas.isDrawingMode) {
            state.canvas.defaultCursor = 'default';
            state.canvas.selection = true;
            state.canvas.requestRenderAll();
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
            state.canvas.freeDrawingBrush.color = options.strokeColorInput.value;
        }

        state.canvas.freeDrawingBrush.width = parseInt(options.sizeInput.value, 10);
        state.canvas.selection = false;
        state.canvas.requestRenderAll();
    }

    function loadSavedState() {
        var savedCard = playerCardStorage.loadPlayerCard();
        if (!savedCard || !savedCard.canvasJson) {
            return loadCanvasJson({
                version: '6.7.1',
                background: '#ffffff',
                objects: []
            });
        }

        return loadCanvasJson(savedCard.canvasJson);
    }

    function loadCanvasJson(canvasJson) {
        state.loading = true;
        return state.canvas.loadFromJSON(canvasJson || {
            version: '6.7.1',
            background: '#ffffff',
            objects: []
        }).then(function () {
            state.canvas.backgroundColor = '#ffffff';
            state.canvas.requestRenderAll();
            state.history = playerCardHistory.createHistoryState(50);
            pushHistory();
            state.loading = false;
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
                selection: true
            });

            state.canvas.on('path:created', function () {
                if (!state.loading) {
                    pushHistory();
                }
            });
            state.canvas.on('object:added', function () {
                if (!state.loading) {
                    pushHistory();
                }
            });
            state.canvas.on('object:modified', function () {
                if (!state.loading) {
                    pushHistory();
                }
            });
            state.canvas.on('object:removed', function () {
                if (!state.loading) {
                    pushHistory();
                }
            });

            options.strokeColorInput.addEventListener('input', updateBrush);
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
        options.selectButton.classList.toggle('active', tool === 'select');
        options.drawButton.classList.toggle('active', tool === 'draw');
        options.eraseButton.classList.toggle('active', tool === 'erase');
    }

    function undo() {
        var result = playerCardHistory.undo(state.history);
        state.history = result.historyState;
        if (!result.snapshot) {
            return;
        }
        restoreFromHistory(result.snapshot);
    }

    function redo() {
        var result = playerCardHistory.redo(state.history);
        state.history = result.historyState;
        if (!result.snapshot) {
            return;
        }
        restoreFromHistory(result.snapshot);
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

    function addRectangle() {
        if (!state.canvas || !state.fabric) {
            return;
        }

        state.canvas.add(new state.fabric.Rect({
            left: 80,
            top: 60,
            width: 120,
            height: 70,
            fill: options.fillColorInput.value,
            stroke: options.strokeColorInput.value,
            strokeWidth: parseInt(options.sizeInput.value, 10)
        }));
        setTool('select');
    }

    function addCircle() {
        if (!state.canvas || !state.fabric) {
            return;
        }

        state.canvas.add(new state.fabric.Circle({
            left: 100,
            top: 45,
            radius: 45,
            fill: options.fillColorInput.value,
            stroke: options.strokeColorInput.value,
            strokeWidth: parseInt(options.sizeInput.value, 10)
        }));
        setTool('select');
    }

    function addLine() {
        if (!state.canvas || !state.fabric) {
            return;
        }

        state.canvas.add(new state.fabric.Line([60, 110, 240, 110], {
            stroke: options.strokeColorInput.value,
            strokeWidth: parseInt(options.sizeInput.value, 10)
        }));
        setTool('select');
    }

    function addText() {
        if (!state.canvas || !state.fabric) {
            return;
        }

        var text = new state.fabric.Textbox('Text', {
            left: 70,
            top: 80,
            width: 160,
            fontSize: 28,
            fill: options.strokeColorInput.value
        });
        state.canvas.add(text);
        state.canvas.setActiveObject(text);
        setTool('select');
    }

    function downloadBlob(content, mimeType, filename) {
        var blob = new Blob([content], {type: mimeType});
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    function exportPng() {
        if (!state.canvas) {
            return;
        }

        var link = document.createElement('a');
        link.href = state.canvas.toDataURL({
            format: 'png',
            multiplier: 1
        });
        link.download = 'player-card.png';
        link.click();
        setPanelMessage('PNG exported.');
    }

    function exportJson() {
        if (!state.canvas) {
            return;
        }

        downloadBlob(
            JSON.stringify(state.canvas.toJSON(), null, 2),
            'application/json',
            'player-card.json'
        );
        setPanelMessage('JSON exported.');
    }

    function save() {
        var payload = exportPayload();
        if (!payload) {
            return;
        }

        playerCardStorage.savePlayerCard(payload);
        if (options.onSave) {
            options.onSave(payload);
        }
        setPanelMessage('Card saved.');
        return payload;
    }

    function exportPayload() {
        if (!state.canvas) {
            return null;
        }

        return {
            previewDataUrl: state.canvas.toDataURL({
                format: 'png',
                multiplier: 1
            }),
            canvasJson: state.canvas.toJSON()
        };
    }

    options.closeButton.addEventListener('click', function () {
        close();
    });
    options.selectButton.addEventListener('click', function () {
        setTool('select');
    });
    options.drawButton.addEventListener('click', function () {
        setTool('draw');
    });
    options.eraseButton.addEventListener('click', function () {
        setTool('erase');
    });
    options.rectangleButton.addEventListener('click', function () {
        addRectangle();
    });
    options.circleButton.addEventListener('click', function () {
        addCircle();
    });
    options.lineButton.addEventListener('click', function () {
        addLine();
    });
    options.textButton.addEventListener('click', function () {
        addText();
    });
    options.undoButton.addEventListener('click', function () {
        undo();
    });
    options.redoButton.addEventListener('click', function () {
        redo();
    });
    options.clearButton.addEventListener('click', function () {
        clear();
    });
    options.saveButton.addEventListener('click', function () {
        save();
    });
    options.exportPngButton.addEventListener('click', function () {
        exportPng();
    });
    options.exportJsonButton.addEventListener('click', function () {
        exportJson();
    });

    setTool('draw');

    return {
        open: open,
        close: close,
        loadCanvasJson: function (canvasJson) {
            return ensureCanvas().then(function () {
                return loadCanvasJson(canvasJson);
            });
        },
        exportPayload: exportPayload,
        saveCurrent: save,
        setMessage: setPanelMessage
    };
}

module.exports = createPlayerCardEditor;
