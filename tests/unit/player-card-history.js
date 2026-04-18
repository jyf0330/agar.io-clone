/*jshint expr:true */

const expect = require('chai').expect;
const history = require('../../apps/client/src/player-card-history');

describe('player-card-history.js', () => {
  it('should support undo and redo across snapshots', () => {
    var state = history.createHistoryState(5);
    state = history.pushSnapshot(state, 'one');
    state = history.pushSnapshot(state, 'two');
    state = history.pushSnapshot(state, 'three');

    var undoResult = history.undo(state);
    expect(undoResult.snapshot).to.equal('two');

    var redoResult = history.redo(undoResult.historyState);
    expect(redoResult.snapshot).to.equal('three');
  });

  it('should discard redo history when a new snapshot is pushed', () => {
    var state = history.createHistoryState(5);
    state = history.pushSnapshot(state, 'one');
    state = history.pushSnapshot(state, 'two');
    state = history.pushSnapshot(state, 'three');

    var undoResult = history.undo(state);
    state = history.pushSnapshot(undoResult.historyState, 'four');
    var redoResult = history.redo(state);

    expect(redoResult.snapshot).to.equal(null);
    expect(state.snapshots).to.deep.equal(['one', 'two', 'four']);
  });
});
