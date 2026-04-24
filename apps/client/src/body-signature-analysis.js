'use strict';

var GRID_SIZE = 16;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function createEmptyGrid() {
    var grid = [];
    for (var y = 0; y < GRID_SIZE; y++) {
        grid[y] = [];
        for (var x = 0; x < GRID_SIZE; x++) {
            grid[y][x] = 0;
        }
    }
    return grid;
}

function paintCell(grid, x, y, value) {
    if (grid[y] && typeof grid[y][x] !== 'undefined') {
        grid[y][x] = Math.max(grid[y][x], value);
    }
}

function createReferenceGrid(referenceId) {
    var grid = createEmptyGrid();
    var x;
    var y;
    var centerX = 7.5;
    var centerY = 8.8;

    for (y = 0; y < GRID_SIZE; y++) {
        for (x = 0; x < GRID_SIZE; x++) {
            if (referenceId === 'hand-grab') {
                if (Math.pow((x - centerX) / 4.3, 2) + Math.pow((y - centerY) / 3.8, 2) < 1) {
                    paintCell(grid, x, y, 1);
                }
                if (y > 3 && y < 9 && Math.abs(x - 4) < 1.7) {
                    paintCell(grid, x, y, 0.75);
                }
                if (y > 3 && y < 8 && Math.abs(x - 11) < 1.7) {
                    paintCell(grid, x, y, 0.75);
                }
            } else if (referenceId === 'hand-thread') {
                if (Math.abs(x - y + 1) < 1.6 && x > 2 && x < 13) {
                    paintCell(grid, x, y, 0.95);
                }
                if (Math.abs(x + y - 16) < 1.5 && x > 2 && x < 13) {
                    paintCell(grid, x, y, 0.8);
                }
                if (Math.pow((x - centerX) / 3.5, 2) + Math.pow((y - 10) / 2.5, 2) < 1) {
                    paintCell(grid, x, y, 0.75);
                }
            } else {
                if (y > 6 && y < 14 && Math.abs(x - centerX) < 3.3) {
                    paintCell(grid, x, y, 0.9);
                }
                if (y > 2 && y < 8 && (Math.abs(x - 4) < 1 || Math.abs(x - 6) < 1 || Math.abs(x - 8) < 1 || Math.abs(x - 10) < 1)) {
                    paintCell(grid, x, y, 1);
                }
                if (y > 5 && y < 10 && Math.abs(x - 12) < 1.4) {
                    paintCell(grid, x, y, 0.75);
                }
            }
        }
    }

    return grid;
}

function canvasToGrid(canvas) {
    var context = canvas.getContext('2d');
    var imageData = context.getImageData(0, 0, canvas.width, canvas.height).data;
    var grid = createEmptyGrid();
    var cellWidth = canvas.width / GRID_SIZE;
    var cellHeight = canvas.height / GRID_SIZE;
    var x;
    var y;
    var px;
    var py;
    var count;
    var ink;
    var index;
    var red;
    var green;
    var blue;
    var alpha;

    for (y = 0; y < GRID_SIZE; y++) {
        for (x = 0; x < GRID_SIZE; x++) {
            count = 0;
            ink = 0;
            for (py = Math.floor(y * cellHeight); py < Math.floor((y + 1) * cellHeight); py += 3) {
                for (px = Math.floor(x * cellWidth); px < Math.floor((x + 1) * cellWidth); px += 3) {
                    index = (py * canvas.width + px) * 4;
                    red = imageData[index];
                    green = imageData[index + 1];
                    blue = imageData[index + 2];
                    alpha = imageData[index + 3];
                    count += 1;
                    if (alpha > 10 && (red < 245 || green < 245 || blue < 245)) {
                        ink += 1;
                    }
                }
            }
            grid[y][x] = count ? ink / count : 0;
        }
    }

    return grid;
}

function gridCoverage(grid) {
    var total = 0;
    var y;
    var x;

    for (y = 0; y < grid.length; y++) {
        for (x = 0; x < grid[y].length; x++) {
            total += clamp(grid[y][x], 0, 1);
        }
    }

    return total / (GRID_SIZE * GRID_SIZE);
}

function compareGrids(a, b) {
    var diff = 0;
    var y;
    var x;

    for (y = 0; y < GRID_SIZE; y++) {
        for (x = 0; x < GRID_SIZE; x++) {
            diff += Math.abs(((a[y] && a[y][x]) || 0) - ((b[y] && b[y][x]) || 0));
        }
    }

    return clamp(1 - diff / (GRID_SIZE * GRID_SIZE), 0, 1);
}

function getTier(similarity, tiers) {
    if (similarity >= tiers.echo.minSimilarity) {
        return 'echo';
    }
    if (similarity >= tiers.faint.minSimilarity) {
        return 'faint';
    }
    return 'none';
}

function analyzeCanvas(canvas, references, tiers) {
    var playerGrid = canvasToGrid(canvas);
    var coverage = gridCoverage(playerGrid);
    var best = null;

    references.forEach(function (reference) {
        var referenceGrid = createReferenceGrid(reference.id);
        var similarity = compareGrids(playerGrid, referenceGrid);

        if (!best || similarity > best.similarity) {
            best = {
                referenceId: reference.id,
                part: reference.part,
                similarity: similarity,
                coverage: coverage
            };
        }
    });

    if (!best || coverage < 0.008) {
        return {
            referenceId: references[0] && references[0].id,
            part: references[0] && references[0].part,
            similarity: 0,
            coverage: coverage,
            tier: 'none',
            bonus: tiers.none.bonus
        };
    }

    best.similarity = clamp((best.similarity * 0.75) + clamp(coverage * 3, 0, 0.25), 0, 1);
    best.tier = getTier(best.similarity, tiers);
    best.bonus = tiers[best.tier].bonus;
    return best;
}

module.exports = {
    GRID_SIZE: GRID_SIZE,
    createEmptyGrid: createEmptyGrid,
    createReferenceGrid: createReferenceGrid,
    compareGrids: compareGrids,
    gridCoverage: gridCoverage,
    getTier: getTier,
    analyzeCanvas: analyzeCanvas
};
