'use strict';

var PREVIEW_SIZE = 112;

function drawRect(context, object, isMissing) {
    var left = object.left || 0;
    var top = object.top || 0;
    var width = object.width || 0;
    var height = object.height || 0;

    if (isMissing) {
        context.save();
        context.setLineDash([6, 4]);
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 3;
        context.strokeRect(left, top, width, height);
        context.restore();
        return;
    }

    if (object.fill) {
        context.fillStyle = object.fill;
        context.fillRect(left, top, width, height);
    }

    if (object.stroke) {
        context.strokeStyle = object.stroke;
        context.lineWidth = object.strokeWidth || 1;
        context.strokeRect(left, top, width, height);
    }
}

function drawCircle(context, object, isMissing) {
    var radius = object.radius || 0;
    var centerX = (object.left || 0) + radius;
    var centerY = (object.top || 0) + radius;

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.closePath();

    if (isMissing) {
        context.save();
        context.setLineDash([6, 4]);
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 3;
        context.stroke();
        context.restore();
        return;
    }

    if (object.fill) {
        context.fillStyle = object.fill;
        context.fill();
    }

    if (object.stroke) {
        context.strokeStyle = object.stroke;
        context.lineWidth = object.strokeWidth || 1;
        context.stroke();
    }
}

function drawLine(context, object, isMissing) {
    context.beginPath();
    context.moveTo(object.x1 || 0, object.y1 || 0);
    context.lineTo(object.x2 || 0, object.y2 || 0);

    if (isMissing) {
        context.save();
        context.setLineDash([6, 4]);
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 3;
        context.stroke();
        context.restore();
        return;
    }

    context.strokeStyle = object.stroke || '#111111';
    context.lineWidth = object.strokeWidth || 1;
    context.stroke();
}

function drawShape(context, object, missingPartType) {
    var isMissing = object.partType === missingPartType;

    if (object.type === 'Rect') {
        drawRect(context, object, isMissing);
        return;
    }

    if (object.type === 'Circle') {
        drawCircle(context, object, isMissing);
        return;
    }

    if (object.type === 'Line') {
        drawLine(context, object, isMissing);
    }
}

function createDraftPreviewDataUrl(candidate) {
    if (typeof document === 'undefined') {
        return null;
    }

    var canvas = document.createElement('canvas');
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    var context = canvas.getContext('2d');
    var scale = PREVIEW_SIZE / 320;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    context.save();
    context.beginPath();
    context.arc(PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, PREVIEW_SIZE / 2, 0, Math.PI * 2);
    context.closePath();
    context.clip();
    context.scale(scale, scale);

    var previewSource = candidate.fullShapeData || candidate.baseShapeData || { objects: [] };
    previewSource.objects.forEach(function (object) {
        drawShape(context, object, candidate.missingPartType);
    });

    context.restore();
    return canvas.toDataURL('image/png');
}

module.exports = {
    createDraftPreviewDataUrl: createDraftPreviewDataUrl
};
