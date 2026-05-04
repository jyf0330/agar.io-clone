const FULL_ANGLE = 2 * Math.PI;
const avatarDraftConfig = require('./avatar-draft-config');
const avatarRuntimeRender = require('./avatar-runtime-render');
const avatarSkeletonLoader = require('./avatar-skeleton-loader');
const avatarImageCache = {};
const bodyAssemblyImageCache = {};
const BODY_ASSEMBLY_LAYER_ORDER = ['base', 'head', 'body', 'hand_left', 'hand_right', 'leg_left', 'leg_right'];
const BODY_ASSEMBLY_CANVAS_SIZE = 1024;
const BODY_ASSEMBLY_BASE_Z_INDEX = -10;
const BODY_ASSEMBLY_PART_SCALE = 0.46;
const BODY_ASSEMBLY_OBJECT_SCALE = 2.75;
const INVINCIBLE_BLINK_INTERVAL_MS = 160;
const INVINCIBLE_BLINK_HIGH_ALPHA = 0.92;
const INVINCIBLE_BLINK_LOW_ALPHA = 0.35;

const drawRoundObject = (position, radius, graph) => {
    graph.beginPath();
    graph.arc(position.x, position.y, radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fill();
    graph.stroke();
}

const getCurrentAlpha = (graph) => {
    return typeof graph.globalAlpha === 'number' ? graph.globalAlpha : 1;
};

const getSelfInvincibleBlinkAlpha = (cell, now) => {
    const hasActiveDeadline = cell && typeof cell.invincibleUntil === 'number' && now < cell.invincibleUntil;
    const hasActiveFlag = cell && cell.isInvincible === true;

    if (!cell || cell.isSelf !== true || (!hasActiveDeadline && !hasActiveFlag)) {
        return 1;
    }

    return Math.floor(now / INVINCIBLE_BLINK_INTERVAL_MS) % 2 === 0
        ? INVINCIBLE_BLINK_HIGH_ALPHA
        : INVINCIBLE_BLINK_LOW_ALPHA;
};

const drawFood = (position, food, graph) => {
    graph.fillStyle = 'hsl(' + food.hue + ', 100%, 50%)';
    graph.strokeStyle = 'hsl(' + food.hue + ', 100%, 45%)';
    graph.lineWidth = 0;
    drawRoundObject(position, food.radius, graph);
};

const drawVirus = (position, virus, graph) => {
    graph.strokeStyle = virus.stroke;
    graph.fillStyle = virus.fill;
    graph.lineWidth = virus.strokeWidth;
    let theta = 0;
    let sides = 20;

    graph.beginPath();
    for (let theta = 0; theta < FULL_ANGLE; theta += FULL_ANGLE / sides) {
        let point = circlePoint(position, virus.radius, theta);
        graph.lineTo(point.x, point.y);
    }
    graph.closePath();
    graph.stroke();
    graph.fill();
};

const drawFireFood = (position, mass, playerConfig, graph) => {
    graph.strokeStyle = 'hsl(' + mass.hue + ', 100%, 45%)';
    graph.fillStyle = 'hsl(' + mass.hue + ', 100%, 50%)';
    graph.lineWidth = playerConfig.border + 2;
    drawRoundObject(position, mass.radius - 1, graph);
};

const drawPartLoot = (position, loot, graph) => {
    const radius = loot.radius || 28;
    const part = loot.part || {};
    const image = getBodyAssemblyImage(part);
    const label = part.type ? part.type : 'PART';

    if (image && (part.imageObject || image.complete)) {
        graph.save();
        graph.beginPath();
        graph.arc(position.x, position.y, radius, 0, FULL_ANGLE);
        graph.closePath();
        graph.fillStyle = 'rgba(255, 244, 194, 0.82)';
        graph.strokeStyle = '#5b3a00';
        graph.lineWidth = 3;
        graph.fill();
        graph.stroke();
        graph.drawImage(image, position.x - radius, position.y - radius, radius * 2, radius * 2);
        graph.restore();
        return;
    }

    graph.save();
    graph.beginPath();
    graph.moveTo(position.x, position.y - radius);
    graph.lineTo(position.x + radius, position.y);
    graph.lineTo(position.x, position.y + radius);
    graph.lineTo(position.x - radius, position.y);
    graph.closePath();
    graph.fillStyle = 'rgba(255, 217, 102, 0.88)';
    graph.strokeStyle = '#5b3a00';
    graph.lineWidth = 3;
    graph.fill();
    graph.stroke();
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = 'bold 11px sans-serif';
    graph.fillStyle = '#2f2200';
    graph.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    graph.lineWidth = 2;
    graph.strokeText(label, position.x, position.y);
    graph.fillText(label, position.x, position.y);
    graph.restore();
};

const drawGhost = (position, ghost, graph) => {
    const radius = ghost.radius || 34;

    graph.save();
    graph.globalAlpha = 0.42;
    graph.beginPath();
    graph.arc(position.x, position.y, radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fillStyle = '#aee8ff';
    graph.strokeStyle = '#ffffff';
    graph.lineWidth = 3;
    graph.fill();
    graph.stroke();
    graph.globalAlpha = 1;
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = 'bold 12px sans-serif';
    graph.fillStyle = '#ffffff';
    graph.strokeStyle = 'rgba(31, 56, 68, 0.8)';
    graph.lineWidth = 2;
    graph.strokeText(ghost.name || 'Echo', position.x, position.y);
    graph.fillText(ghost.name || 'Echo', position.x, position.y);
    if (ghost.chat) {
        graph.font = 'bold 11px sans-serif';
        graph.strokeText(ghost.chat, position.x, position.y - radius - 4);
        graph.fillText(ghost.chat, position.x, position.y - radius - 4);
    }
    graph.restore();
};

const drawPet = (position, pet, graph) => {
    const radius = pet.radius || 18;

    graph.save();
    graph.beginPath();
    graph.arc(position.x, position.y, radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fillStyle = 'rgba(255, 245, 180, 0.9)';
    graph.strokeStyle = '#6b5b20';
    graph.lineWidth = 2;
    graph.fill();
    graph.stroke();
    graph.textAlign = 'center';
    graph.textBaseline = 'middle';
    graph.font = 'bold 10px sans-serif';
    graph.fillStyle = '#3d3312';
    graph.fillText(pet.name || pet.petId || 'pet', position.x, position.y - radius - 8);
    graph.restore();
};

const valueInRange = (min, max, value) => Math.min(max, Math.max(min, value))

const circlePoint = (origo, radius, theta) => ({
    x: origo.x + radius * Math.cos(theta),
    y: origo.y + radius * Math.sin(theta)
});

const cellTouchingBorders = (cell, borders) =>
    cell.x - cell.radius <= borders.left ||
    cell.x + cell.radius >= borders.right ||
    cell.y - cell.radius <= borders.top ||
    cell.y + cell.radius >= borders.bottom

const regulatePoint = (point, borders) => ({
    x: valueInRange(borders.left, borders.right, point.x),
    y: valueInRange(borders.top, borders.bottom, point.y)
});

const drawCellWithLines = (cell, borders, graph) => {
    let pointCount = 30 + ~~(cell.mass / 5);
    let points = [];
    for (let theta = 0; theta < FULL_ANGLE; theta += FULL_ANGLE / pointCount) {
        let point = circlePoint(cell, cell.radius, theta);
        points.push(regulatePoint(point, borders));
    }
    graph.beginPath();
    graph.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        graph.lineTo(points[i].x, points[i].y);
    }
    graph.closePath();
    graph.fill();
    graph.stroke();
}

const getAvatarImage = (previewDataUrl) => {
    if (!previewDataUrl) {
        return null;
    }

    if (!avatarImageCache[previewDataUrl]) {
        const image = new Image();
        image.src = previewDataUrl;
        avatarImageCache[previewDataUrl] = image;
    }

    return avatarImageCache[previewDataUrl];
};

const getCellAvatarImage = (cell) => {
    if (cell.isNpc && cell.skeletonKey) {
        return avatarSkeletonLoader.getSkeletonByKey(cell.skeletonKey);
    }

    if (cell.playerCardPreviewDataUrl) {
        return getAvatarImage(cell.playerCardPreviewDataUrl);
    }

    return null;
};

const getBodyAssemblyImage = (layer) => {
    const imagePath = layer && layer.image;

    if (!layer) {
        return null;
    }
    if (layer.imageObject) {
        return layer.imageObject;
    }
    if (!imagePath || typeof Image === 'undefined') {
        return null;
    }

    if (!bodyAssemblyImageCache[imagePath]) {
        const image = new Image();
        image.src = imagePath;
        bodyAssemblyImageCache[imagePath] = image;
    }

    return bodyAssemblyImageCache[imagePath];
};

const getBodyAssemblyDrawPlan = (bodyAssembly) => {
    if (!bodyAssembly || !bodyAssembly.layers) {
        return [];
    }

    return BODY_ASSEMBLY_LAYER_ORDER
        .filter((layerId) => bodyAssembly.layers[layerId])
        .map((layerId) => ({
            layerId: layerId,
            layer: bodyAssembly.layers[layerId],
            anchor: layerId === 'base'
                ? { x: BODY_ASSEMBLY_CANVAS_SIZE / 2, y: BODY_ASSEMBLY_CANVAS_SIZE / 2, zIndex: BODY_ASSEMBLY_BASE_Z_INDEX }
                : (bodyAssembly.anchors && bodyAssembly.anchors[layerId])
        }))
        .filter((entry) => entry.anchor)
        .sort((a, b) => a.anchor.zIndex - b.anchor.zIndex);
};

const drawBodyAssemblyCell = (cell, graph) => {
    const objectSize = cell.radius * BODY_ASSEMBLY_OBJECT_SCALE;
    const originX = cell.x - objectSize / 2;
    const originY = cell.y - objectSize / 2;
    const partSize = objectSize * BODY_ASSEMBLY_PART_SCALE;

    graph.save();
    graph.beginPath();
    graph.arc(cell.x, cell.y, cell.radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fillStyle = 'rgba(236, 212, 162, 0.42)';
    graph.fill();
    graph.strokeStyle = cell.borderColor || 'rgba(43, 29, 20, 0.82)';
    graph.lineWidth = Math.max(2, cell.radius * 0.08);
    graph.stroke();

    getBodyAssemblyDrawPlan(cell.bodyAssembly).forEach((entry) => {
        const image = getBodyAssemblyImage(entry.layer);
        const layerSize = entry.layerId === 'base' ? objectSize : partSize;
        const layerX = originX + (entry.anchor.x / BODY_ASSEMBLY_CANVAS_SIZE) * objectSize - layerSize / 2;
        const layerY = originY + (entry.anchor.y / BODY_ASSEMBLY_CANVAS_SIZE) * objectSize - layerSize / 2;

        if (image && (entry.layer.imageObject || image.complete)) {
            graph.drawImage(image, layerX, layerY, layerSize, layerSize);
        }
    });
    graph.restore();
};

const drawAvatarCell = (cell, graph) => {
    const inheritedAlpha = getCurrentAlpha(graph);

    graph.save();
    graph.beginPath();
    graph.arc(cell.x, cell.y, cell.radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fillStyle = 'rgba(255, 255, 255, 0.16)';
    graph.fill();

    const image = getCellAvatarImage(cell);
    const innerRadius = avatarRuntimeRender.getAvatarInnerRadius(cell);
    if (image && image.complete) {
        graph.save();
        graph.beginPath();
        graph.arc(cell.x, cell.y, innerRadius, 0, FULL_ANGLE);
        graph.closePath();
        graph.clip();
        graph.globalAlpha = inheritedAlpha * 0.82;
        graph.drawImage(
            image,
            cell.x - innerRadius,
            cell.y - innerRadius,
            innerRadius * 2,
            innerRadius * 2
        );
        graph.restore();
    }

    graph.beginPath();
    graph.arc(cell.x, cell.y, cell.radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.lineWidth = 6;
    graph.strokeStyle = cell.borderColor;
    graph.stroke();

    graph.beginPath();
    graph.arc(cell.x, cell.y, cell.radius * 0.86, 0, FULL_ANGLE);
    graph.closePath();
    graph.lineWidth = 2;
    graph.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    graph.stroke();
    graph.restore();
};

const drawCells = (cells, playerConfig, toggleMassState, borders, graph) => {
    const now = Date.now();

    for (let cell of cells) {
        const blinkAlpha = getSelfInvincibleBlinkAlpha(cell, now);
        const touchingBorders = cellTouchingBorders(cell, borders);
        const useAvatarRuntimeRender = avatarRuntimeRender.shouldUseAvatarRuntimeRender(
            cell,
            avatarDraftConfig,
            touchingBorders
        );

        if (blinkAlpha < 1) {
            graph.save();
            graph.globalAlpha = getCurrentAlpha(graph) * blinkAlpha;
        }

        // Draw the cell itself
        if (cell.bodyAssembly) {
            drawBodyAssemblyCell(cell, graph);
        } else if (useAvatarRuntimeRender) {
            drawAvatarCell(cell, graph);
        } else {
            graph.fillStyle = cell.color;
            graph.strokeStyle = cell.borderColor;
            graph.lineWidth = 6;
        if (touchingBorders) {
            // Asssemble the cell from lines
            drawCellWithLines(cell, borders, graph);
        } else {
            // Border corrections are not needed, the cell can be drawn as a circle
            drawRoundObject(cell, cell.radius, graph);
        }
        }

        // Draw the name of the player
        let fontSize = Math.max(cell.radius / 3, 12);
        graph.lineWidth = playerConfig.textBorderSize;
        graph.fillStyle = playerConfig.textColor;
        graph.strokeStyle = playerConfig.textBorder;
        graph.miterLimit = 1;
        graph.lineJoin = 'round';
        graph.textAlign = 'center';
        graph.textBaseline = 'middle';
        graph.font = 'bold ' + fontSize + 'px sans-serif';
        if (Number.isFinite(cell.bodyPartCount)) {
            graph.font = 'bold ' + Math.max(Math.min(cell.radius / 4, 14), 10) + 'px sans-serif';
            graph.textBaseline = 'bottom';
            graph.strokeText('部件 ' + Math.round(cell.bodyPartCount), cell.x, cell.y - cell.radius - 6);
            graph.fillText('部件 ' + Math.round(cell.bodyPartCount), cell.x, cell.y - cell.radius - 6);
            graph.font = 'bold ' + fontSize + 'px sans-serif';
            graph.textBaseline = 'middle';
        }
        graph.strokeText(cell.name, cell.x, cell.y);
        graph.fillText(cell.name, cell.x, cell.y);

        // Draw the mass (if enabled)
        if (toggleMassState === 1) {
            graph.font = 'bold ' + Math.max(fontSize / 3 * 2, 10) + 'px sans-serif';
            if (cell.name.length === 0) fontSize = 0;
            graph.strokeText(Math.round(cell.mass), cell.x, cell.y + fontSize);
            graph.fillText(Math.round(cell.mass), cell.x, cell.y + fontSize);
        }

        if (blinkAlpha < 1) {
            graph.restore();
        }
    }
};

const drawGrid = (global, player, screen, graph) => {
    graph.lineWidth = 1;
    graph.strokeStyle = global.lineColor;
    graph.globalAlpha = 0.15;
    graph.beginPath();

    for (let x = -player.x; x < screen.width; x += screen.height / 18) {
        graph.moveTo(x, 0);
        graph.lineTo(x, screen.height);
    }

    for (let y = -player.y; y < screen.height; y += screen.height / 18) {
        graph.moveTo(0, y);
        graph.lineTo(screen.width, y);
    }

    graph.stroke();
    graph.globalAlpha = 1;
};

const drawBorder = (borders, graph) => {
    graph.lineWidth = 1;
    graph.strokeStyle = '#000000'
    graph.beginPath()
    graph.moveTo(borders.left, borders.top);
    graph.lineTo(borders.right, borders.top);
    graph.lineTo(borders.right, borders.bottom);
    graph.lineTo(borders.left, borders.bottom);
    graph.closePath()
    graph.stroke();
};

const drawErrorMessage = (message, graph, screen) => {
    graph.fillStyle = '#333333';
    graph.fillRect(0, 0, screen.width, screen.height);
    graph.textAlign = 'center';
    graph.fillStyle = '#FFFFFF';
    graph.font = 'bold 30px sans-serif';
    graph.fillText(message, screen.width / 2, screen.height / 2);
}

module.exports = {
    drawFood,
    drawVirus,
    drawFireFood,
    drawPartLoot,
    drawGhost,
    drawPet,
    drawBodyAssemblyCell,
    drawCells,
    drawErrorMessage,
    drawGrid,
    drawBorder
};
