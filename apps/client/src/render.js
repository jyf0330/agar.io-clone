const FULL_ANGLE = 2 * Math.PI;
const avatarDraftConfig = require('./avatar-draft-config');
const avatarRuntimeRender = require('./avatar-runtime-render');
const avatarImageCache = {};

const drawRoundObject = (position, radius, graph) => {
    graph.beginPath();
    graph.arc(position.x, position.y, radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fill();
    graph.stroke();
}

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
    const label = loot.part && loot.part.type ? loot.part.type : 'PART';

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

const drawAvatarCell = (cell, graph) => {
    graph.save();
    graph.beginPath();
    graph.arc(cell.x, cell.y, cell.radius, 0, FULL_ANGLE);
    graph.closePath();
    graph.fillStyle = 'rgba(255, 255, 255, 0.16)';
    graph.fill();

    const image = getAvatarImage(cell.playerCardPreviewDataUrl);
    const innerRadius = avatarRuntimeRender.getAvatarInnerRadius(cell);
    if (image && image.complete) {
        graph.save();
        graph.beginPath();
        graph.arc(cell.x, cell.y, innerRadius, 0, FULL_ANGLE);
        graph.closePath();
        graph.clip();
        graph.globalAlpha = 0.82;
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
    for (let cell of cells) {
        const touchingBorders = cellTouchingBorders(cell, borders);
        const useAvatarRuntimeRender = avatarRuntimeRender.shouldUseAvatarRuntimeRender(
            cell,
            avatarDraftConfig,
            touchingBorders
        );

        // Draw the cell itself
        if (useAvatarRuntimeRender) {
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
        graph.strokeText(cell.name, cell.x, cell.y);
        graph.fillText(cell.name, cell.x, cell.y);

        // Draw the mass (if enabled)
        if (toggleMassState === 1) {
            graph.font = 'bold ' + Math.max(fontSize / 3 * 2, 10) + 'px sans-serif';
            if (cell.name.length === 0) fontSize = 0;
            graph.strokeText(Math.round(cell.mass), cell.x, cell.y + fontSize);
            graph.fillText(Math.round(cell.mass), cell.x, cell.y + fontSize);
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
    drawCells,
    drawErrorMessage,
    drawGrid,
    drawBorder
};
