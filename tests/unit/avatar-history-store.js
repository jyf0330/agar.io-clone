/*jshint expr:true */

const expect = require('chai').expect;
const historyStore = require('../../apps/client/src/avatar-history-store');

describe('avatar-history-store.js', () => {
  function createMemoryStorage() {
    const values = {};
    return {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
      },
      setItem(key, value) {
        values[key] = String(value);
      },
      removeItem(key) {
        delete values[key];
      }
    };
  }

  it('should add new entries to the front and trim by max count', () => {
    var storage = createMemoryStorage();
    historyStore.addHistoryEntry({ id: 'one' }, storage, 2);
    historyStore.addHistoryEntry({ id: 'two' }, storage, 2);
    historyStore.addHistoryEntry({ id: 'three' }, storage, 2);

    expect(historyStore.loadHistory(storage).map((entry) => entry.id)).to.deep.equal(['three', 'two']);
  });

  it('should create a history entry from a confirmed draft payload', () => {
    var entry = historyStore.createHistoryEntry({
      templateId: 'moon-face',
      missingPartType: 'eye',
      previewDataUrl: 'data:image/png;base64,card'
    });

    expect(entry.templateId).to.equal('moon-face');
    expect(entry.missingPartType).to.equal('eye');
    expect(entry.previewDataUrl).to.equal('data:image/png;base64,card');
    expect(entry.createdAt).to.be.a('string');
  });
});
