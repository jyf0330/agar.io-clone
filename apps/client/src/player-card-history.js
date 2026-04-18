'use strict';

function createHistoryState(limit) {
    return {
        snapshots: [],
        index: -1,
        limit: limit || 30
    };
}

function pushSnapshot(historyState, snapshot) {
    if (!snapshot) {
        return historyState;
    }

    if (historyState.index >= 0 && historyState.snapshots[historyState.index] === snapshot) {
        return historyState;
    }

    var nextSnapshots = historyState.snapshots.slice(0, historyState.index + 1);
    nextSnapshots.push(snapshot);

    if (nextSnapshots.length > historyState.limit) {
        nextSnapshots.shift();
    }

    return {
        snapshots: nextSnapshots,
        index: nextSnapshots.length - 1,
        limit: historyState.limit
    };
}

function undo(historyState) {
    if (historyState.index <= 0) {
        return {
            historyState: historyState,
            snapshot: null
        };
    }

    var nextIndex = historyState.index - 1;
    return {
        historyState: {
            snapshots: historyState.snapshots.slice(),
            index: nextIndex,
            limit: historyState.limit
        },
        snapshot: historyState.snapshots[nextIndex]
    };
}

function redo(historyState) {
    if (historyState.index >= historyState.snapshots.length - 1) {
        return {
            historyState: historyState,
            snapshot: null
        };
    }

    var nextIndex = historyState.index + 1;
    return {
        historyState: {
            snapshots: historyState.snapshots.slice(),
            index: nextIndex,
            limit: historyState.limit
        },
        snapshot: historyState.snapshots[nextIndex]
    };
}

module.exports = {
    createHistoryState: createHistoryState,
    pushSnapshot: pushSnapshot,
    undo: undo,
    redo: redo
};
