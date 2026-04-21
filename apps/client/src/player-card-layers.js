'use strict';

var LAYER_IDS = ['base', 'eyes', 'hair'];

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function createEmptyCanvasJson() {
    return {
        version: '6.7.1',
        objects: []
    };
}

function createDefaultLayerState() {
    return {
        canvasJson: createEmptyCanvasJson(),
        visible: true,
        locked: false
    };
}

function createLayerPayload(layers) {
    var payload = {};

    LAYER_IDS.forEach(function (layerId) {
        payload[layerId] = Object.assign(
            createDefaultLayerState(),
            layers && layers[layerId] ? clone(layers[layerId]) : {}
        );
    });

    return payload;
}

function createLegacyLayerPayload(canvasJson) {
    return createLayerPayload({
        base: {
            canvasJson: canvasJson || createEmptyCanvasJson()
        }
    });
}

function mergeLayerPayloadToCanvasJson(layerPayload) {
    var payload = createLayerPayload(layerPayload);
    var merged = createEmptyCanvasJson();

    LAYER_IDS.forEach(function (layerId) {
        (payload[layerId].canvasJson.objects || []).forEach(function (object) {
            merged.objects.push(clone(object));
        });
    });

    return merged;
}

function splitCanvasJsonByLayer(canvasJson) {
    var payload = createLayerPayload();

    (canvasJson.objects || []).forEach(function (object) {
        var layerId = object.layerId || 'base';
        payload[layerId].canvasJson.objects.push(clone(object));
    });

    return payload;
}

function serializeCanvas(canvas) {
    return canvas.toJSON(['layerId']);
}

function getLayerRenderState(layerState, isActiveLayer) {
    var normalizedState = Object.assign(createDefaultLayerState(), layerState || {});
    var visible = !!normalizedState.visible;
    var editable = isActiveLayer && visible && !normalizedState.locked;

    return {
        visible: visible,
        editable: editable,
        opacity: visible ? 1 : 0
    };
}

module.exports = {
    LAYER_IDS: LAYER_IDS,
    createEmptyCanvasJson: createEmptyCanvasJson,
    createDefaultLayerState: createDefaultLayerState,
    createLayerPayload: createLayerPayload,
    createLegacyLayerPayload: createLegacyLayerPayload,
    mergeLayerPayloadToCanvasJson: mergeLayerPayloadToCanvasJson,
    splitCanvasJsonByLayer: splitCanvasJsonByLayer,
    getLayerRenderState: getLayerRenderState,
    serializeCanvas: serializeCanvas
};
