/*jshint expr:true */

const expect = require('chai').expect;
const storage = require('../../apps/client/src/player-card-storage');

describe('player-card-storage.js', () => {
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

  it('should save and load a player card payload', () => {
    const memoryStorage = createMemoryStorage();
    const payload = {
      previewDataUrl: 'data:image/png;base64,abc',
      canvasJson: { version: '1.0.0', objects: [] }
    };

    storage.savePlayerCard(payload, memoryStorage);

    expect(storage.loadPlayerCard(memoryStorage)).to.deep.equal(payload);
  });

  it('should clear a stored player card payload', () => {
    const memoryStorage = createMemoryStorage();
    storage.savePlayerCard({
      previewDataUrl: 'data:image/png;base64,abc',
      canvasJson: { version: '1.0.0', objects: [] }
    }, memoryStorage);

    storage.clearPlayerCard(memoryStorage);

    expect(storage.loadPlayerCard(memoryStorage)).to.equal(null);
  });
});
