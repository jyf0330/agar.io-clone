/*jshint expr:true */

const expect = require('chai').expect;
const layers = require('../../apps/client/src/player-card-layers');
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

    const loaded = storage.loadPlayerCard(memoryStorage);

    expect(loaded.previewDataUrl).to.equal(payload.previewDataUrl);
    expect(loaded.canvasJson).to.deep.equal(payload.canvasJson);
    expect(loaded.activeLayerId).to.equal('base');
    expect(loaded.layers.base.canvasJson).to.deep.equal(payload.canvasJson);
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

  it('should upgrade legacy payloads into fixed layers', () => {
    const memoryStorage = createMemoryStorage();
    memoryStorage.setItem('agar.playerCard', JSON.stringify({
      previewDataUrl: 'data:image/png;base64,abc',
      canvasJson: {
        version: '6.7.1',
        objects: [{ type: 'Rect', left: 12 }]
      }
    }));

    const loaded = storage.loadPlayerCard(memoryStorage);

    expect(loaded.layers.base.canvasJson.objects).to.have.length(1);
    expect(loaded.layers.eyes.canvasJson.objects).to.have.length(0);
    expect(loaded.layers.hair.canvasJson.objects).to.have.length(0);
    expect(loaded.activeLayerId).to.equal('base');
  });

  it('should preserve fixed layer payloads when saving', () => {
    const memoryStorage = createMemoryStorage();
    const payload = {
      previewDataUrl: 'data:image/png;base64,abc',
      canvasJson: { version: '6.7.1', objects: [] },
      activeLayerId: 'eyes',
      layers: layers.createLayerPayload({
        eyes: {
          canvasJson: { version: '6.7.1', objects: [{ type: 'Circle', layerId: 'eyes' }] }
        }
      })
    };

    storage.savePlayerCard(payload, memoryStorage);
    const loaded = storage.loadPlayerCard(memoryStorage);

    expect(loaded.activeLayerId).to.equal('eyes');
    expect(loaded.layers.eyes.canvasJson.objects).to.have.length(1);
  });
});
