'use strict';

function createRect(left, top, width, height, fill, stroke, strokeWidth, partType) {
    return {
        type: 'Rect',
        originX: 'left',
        originY: 'top',
        left: left,
        top: top,
        width: width,
        height: height,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        partType: partType
    };
}

function createCircle(left, top, radius, fill, stroke, strokeWidth, partType) {
    return {
        type: 'Circle',
        originX: 'left',
        originY: 'top',
        left: left,
        top: top,
        radius: radius,
        fill: fill,
        stroke: stroke,
        strokeWidth: strokeWidth,
        partType: partType
    };
}

function createLine(points, stroke, strokeWidth, partType) {
    return {
        type: 'Line',
        originX: 'left',
        originY: 'top',
        x1: points[0],
        y1: points[1],
        x2: points[2],
        y2: points[3],
        stroke: stroke,
        strokeWidth: strokeWidth,
        partType: partType
    };
}

var DEFAULT_TEMPLATES = [
    {
        id: 'moon-face',
        previewMeta: {
            title: 'Moon Face',
            subtitle: 'Soft face silhouette'
        },
        fullShapeData: {
            version: '6.7.1',
            background: '#ffffff',
            objects: [
                createCircle(90, 28, 62, '#ffe4ec', '#111111', 4, 'base'),
                createLine([118, 86, 140, 86], '#111111', 4, 'eye'),
                createLine([172, 86, 194, 86], '#111111', 4, 'eye'),
                createLine([120, 150, 195, 150], '#111111', 5, 'mouth'),
                createRect(112, 12, 92, 20, '#ff9bc6', '#111111', 3, 'hair'),
                createLine([92, 180, 112, 210], '#111111', 5, 'arm'),
                createLine([214, 180, 234, 210], '#111111', 5, 'arm'),
                createCircle(224, 44, 12, '#8ed7ff', '#111111', 3, 'accessory')
            ]
        }
    },
    {
        id: 'sprout-head',
        previewMeta: {
            title: 'Sprout Head',
            subtitle: 'Plant-like sketch'
        },
        fullShapeData: {
            version: '6.7.1',
            background: '#ffffff',
            objects: [
                createCircle(94, 36, 58, '#d9f7d1', '#111111', 4, 'base'),
                createLine([126, 92, 142, 92], '#111111', 4, 'eye'),
                createLine([170, 92, 186, 92], '#111111', 4, 'eye'),
                createLine([128, 146, 186, 154], '#111111', 5, 'mouth'),
                createLine([156, 34, 142, 4], '#2f8f4e', 4, 'hair'),
                createLine([156, 34, 176, 0], '#2f8f4e', 4, 'hair'),
                createLine([100, 184, 116, 216], '#111111', 5, 'leg'),
                createLine([212, 184, 196, 216], '#111111', 5, 'leg')
            ]
        }
    },
    {
        id: 'mask-runner',
        previewMeta: {
            title: 'Mask Runner',
            subtitle: 'Sharp masked face'
        },
        fullShapeData: {
            version: '6.7.1',
            background: '#ffffff',
            objects: [
                createRect(98, 44, 124, 116, '#f8f3d4', '#111111', 4, 'base'),
                createRect(118, 74, 26, 18, '#111111', '#111111', 2, 'eye'),
                createRect(176, 74, 26, 18, '#111111', '#111111', 2, 'eye'),
                createLine([126, 142, 194, 142], '#111111', 5, 'mouth'),
                createRect(112, 28, 96, 18, '#4a4a88', '#111111', 3, 'hair'),
                createLine([104, 174, 84, 210], '#111111', 5, 'arm'),
                createLine([216, 174, 236, 210], '#111111', 5, 'arm'),
                createRect(222, 54, 20, 20, '#ffcf6b', '#111111', 3, 'accessory')
            ]
        }
    },
    {
        id: 'echo-ghost',
        previewMeta: {
            title: 'Echo Ghost',
            subtitle: 'Thin spectral body'
        },
        fullShapeData: {
            version: '6.7.1',
            background: '#ffffff',
            objects: [
                createCircle(104, 28, 54, '#dff2ff', '#111111', 4, 'base'),
                createCircle(126, 86, 6, '#111111', '#111111', 2, 'eye'),
                createCircle(182, 86, 6, '#111111', '#111111', 2, 'eye'),
                createLine([132, 142, 184, 148], '#111111', 5, 'mouth'),
                createLine([112, 34, 92, 0], '#7b9cf5', 4, 'hair'),
                createLine([206, 34, 226, 0], '#7b9cf5', 4, 'hair'),
                createLine([126, 182, 108, 218], '#111111', 5, 'leg'),
                createLine([194, 182, 212, 218], '#111111', 5, 'leg')
            ]
        }
    }
];

function getDefaultTemplates() {
    return DEFAULT_TEMPLATES.map(function (template) {
        return JSON.parse(JSON.stringify(template));
    });
}

function getDefaultTemplateById(templateId) {
    var templates = getDefaultTemplates();
    for (var i = 0; i < templates.length; i++) {
        if (templates[i].id === templateId) {
            return templates[i];
        }
    }

    return null;
}

module.exports = {
    getDefaultTemplates: getDefaultTemplates,
    getDefaultTemplateById: getDefaultTemplateById
};
