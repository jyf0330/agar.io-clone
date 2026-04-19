'use strict';

var playerCardStorage = require('./player-card-storage');
var playerCardHistory = require('./player-card-history');
var playerCardScale = require('./player-card-scale');
var playerCardCanvasTransform = require('./player-card-canvas-transform');
var i18n = require('./i18n');

var FABRIC_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/fabric@6.7.1/dist/index.min.js';
var CANVAS_SIZE = 320;
var CIRCLE_RADIUS = CANVAS_SIZE / 2;
var KEYBOARD_PAN_STEP = 12;

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
        loading: false,
        contentScale: 1,
        isPanning: false,
        panDirty: false,
        panOrigin: null
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

    function updateZoomButtons() {
        if (!options.zoomInButton || !options.zoomOutButton) {
            return;
        }

        options.zoomInButton.disabled = !playerCardScale.canScaleIn(state.contentScale);
        options.zoomOutButton.disabled = !playerCardScale.canScaleOut(state.contentScale);
    }

    function loadSavedState() {
        var savedCard = playerCardStorage.loadPlayerCard();
        if (!savedCard || !savedCard.canvasJson) {
            return loadCanvasJson({
                version: '6.7.1',
                background: '#ffffff',
                objects: []
            }, 1);
        }

        return loadCanvasJson(savedCard.canvasJson, savedCard.contentScale || 1);
    }

    function loadCanvasJson(canvasJson, contentScale) {
        state.loading = true;
        return state.canvas.loadFromJSON(canvasJson || {
            version: '6.7.1',
            background: '#ffffff',
            objects: []
        }).then(function () {
            state.canvas.backgroundColor = '#ffffff';
            state.contentScale = contentScale || 1;
            state.canvas.requestRenderAll();
            state.history = playerCardHistory.createHistoryState(50);
            pushHistory();
            state.loading = false;
            updateZoomButtons();
        });
    }

    function createCanvasClipPath() {
        return new state.fabric.Circle({
            radius: CIRCLE_RADIUS,
            originX: 'center',
            originY: 'center',
            left: CANVAS_SIZE / 2,
            top: CANVAS_SIZE / 2,
            absolutePositioned: true
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
                width: CANVAS_SIZE,
                height: CANVAS_SIZE,
                selection: true
            });
            state.canvas.clipPath = createCanvasClipPath();

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
            updateZoomButtons();
            bindCanvasGestures();

            return loadSavedState().then(function () {
                return state.canvas;
            });
        });
    }

    function open() {
        options.panelEl.classList.add('open');
        setPanelMessage(i18n.t('editor.loading'));

        return ensureCanvas().then(function () {
            updateBrush();
            setPanelMessage('');
        }).catch(function () {
            setPanelMessage(i18n.t('editor.failed'));
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
            top: 110,
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
            top: 85,
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

        state.canvas.add(new state.fabric.Line([60, 160, 240, 160], {
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
            top: 140,
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

    function exportCircularCanvas() {
        var sourceCanvas = state.canvas.toCanvasElement();
        var exportCanvas = document.createElement('canvas');
        exportCanvas.width = CANVAS_SIZE;
        exportCanvas.height = CANVAS_SIZE;
        var exportContext = exportCanvas.getContext('2d');

        exportContext.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        exportContext.save();
        exportContext.beginPath();
        exportContext.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CIRCLE_RADIUS, 0, Math.PI * 2);
        exportContext.closePath();
        exportContext.clip();
        exportContext.drawImage(sourceCanvas, 0, 0);
        exportContext.restore();

        return exportCanvas;
    }

    function exportPng() {
        if (!state.canvas) {
            return;
        }

        var link = document.createElement('a');
        link.href = exportCircularCanvas().toDataURL('image/png');
        link.download = 'player-card.png';
        link.click();
        setPanelMessage(i18n.t('editor.exportPng'));
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
        setPanelMessage(i18n.t('editor.exportJson'));
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
        setPanelMessage(i18n.t('editor.saved'));
        return payload;
    }

    function exportPayload() {
        if (!state.canvas) {
            return null;
        }

        return {
            previewDataUrl: exportCircularCanvas().toDataURL('image/png'),
            canvasJson: state.canvas.toJSON(),
            contentScale: state.contentScale
        };
    }

    function scaleCanvasContent(direction) {
        if (!state.canvas) {
            return;
        }

        var nextScale = playerCardScale.getNextScale(state.contentScale, direction);
        if (nextScale === state.contentScale) {
            updateZoomButtons();
            return;
        }

        var ratio = nextScale / state.contentScale;
        var centerX = CANVAS_SIZE / 2;
        var centerY = CANVAS_SIZE / 2;

        state.loading = true;
        state.canvas.getObjects().forEach(function (object) {
            playerCardCanvasTransform.scaleObjectAroundPoint(object, ratio, centerX, centerY);
            object.setCoords();
        });
        state.contentScale = nextScale;
        state.loading = false;
        state.canvas.requestRenderAll();
        updateZoomButtons();
        pushHistory();
        setPanelMessage(i18n.t('editor.scale', { value: nextScale.toFixed(2) }));
    }

    function translateCanvasContent(deltaX, deltaY) {
        if (!state.canvas) {
            return;
        }

        state.loading = true;
        state.canvas.getObjects().forEach(function (object) {
            playerCardCanvasTransform.translateObject(object, deltaX, deltaY);
            object.setCoords();
        });
        state.loading = false;
        state.canvas.requestRenderAll();
        state.panDirty = true;
    }

    function stopPan() {
        if (!state.isPanning) {
            return;
        }

        state.isPanning = false;
        state.panOrigin = null;
        document.body.style.cursor = '';
        if (state.panDirty) {
            pushHistory();
            state.panDirty = false;
        }
    }

    function bindCanvasGestures() {
        var upperCanvas = state.canvas.upperCanvasEl;

        upperCanvas.addEventListener('wheel', function (event) {
            event.preventDefault();
            scaleCanvasContent(event.deltaY < 0 ? 'in' : 'out');
        }, { passive: false });

        upperCanvas.addEventListener('mousedown', function (event) {
            if (event.button !== 1) {
                return;
            }

            event.preventDefault();
            state.isPanning = true;
            state.panDirty = false;
            state.panOrigin = {
                x: event.clientX,
                y: event.clientY
            };
            document.body.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', function (event) {
            if (!state.isPanning || !state.panOrigin) {
                return;
            }

            var deltaX = event.clientX - state.panOrigin.x;
            var deltaY = event.clientY - state.panOrigin.y;
            state.panOrigin = {
                x: event.clientX,
                y: event.clientY
            };
            translateCanvasContent(deltaX, deltaY);
        });

        window.addEventListener('mouseup', function () {
            stopPan();
        });

        window.addEventListener('keydown', function (event) {
            var activeElement = document.activeElement;
            var activeObject = state.canvas && state.canvas.getActiveObject ? state.canvas.getActiveObject() : null;
            var panDelta;

            if (!options.panelEl.classList.contains('open')) {
                return;
            }

            if (activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            )) {
                return;
            }

            if (activeObject && activeObject.isEditing) {
                return;
            }

            panDelta = playerCardCanvasTransform.getKeyboardPanDelta(event.key, KEYBOARD_PAN_STEP);
            if (!panDelta) {
                return;
            }

            event.preventDefault();
            translateCanvasContent(panDelta.x, panDelta.y);
            pushHistory();
            state.panDirty = false;
        });
    }

    function bindPressAndHold(button, direction) {
        var timeoutHandle = null;
        var intervalHandle = null;
        var longPressTriggered = false;

        function clearTimers() {
            if (timeoutHandle) {
                window.clearTimeout(timeoutHandle);
                timeoutHandle = null;
            }
            if (intervalHandle) {
                window.clearInterval(intervalHandle);
                intervalHandle = null;
            }
        }

        function stop() {
            clearTimers();
        }

        button.addEventListener('mousedown', function () {
            longPressTriggered = false;
            timeoutHandle = window.setTimeout(function () {
                longPressTriggered = true;
                scaleCanvasContent(direction);
                intervalHandle = window.setInterval(function () {
                    scaleCanvasContent(direction);
                }, 500);
            }, 500);
        });

        button.addEventListener('mouseup', stop);
        button.addEventListener('mouseleave', stop);
        button.addEventListener('touchstart', function (event) {
            event.preventDefault();
            longPressTriggered = false;
            timeoutHandle = window.setTimeout(function () {
                longPressTriggered = true;
                scaleCanvasContent(direction);
                intervalHandle = window.setInterval(function () {
                    scaleCanvasContent(direction);
                }, 500);
            }, 500);
        }, { passive: false });
        button.addEventListener('touchend', stop);
        button.addEventListener('touchcancel', stop);
        button.addEventListener('click', function () {
            if (longPressTriggered) {
                longPressTriggered = false;
                return;
            }
            scaleCanvasContent(direction);
        });
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
    bindPressAndHold(options.zoomInButton, 'in');
    bindPressAndHold(options.zoomOutButton, 'out');

    setTool('draw');
    updateZoomButtons();

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
