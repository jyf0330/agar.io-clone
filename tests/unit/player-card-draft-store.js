/*jshint expr:true */

const expect = require('chai').expect;
const layers = require('../../apps/client/src/player-card-layers');
const draftStore = require('../../apps/client/src/player-card-draft-store');

describe('player-card-draft-store.js', () => {
  function createMemoryStorage() {
    const values = {};
    return {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
      },
      setItem(key, value) {
        values[key] = String(value);
      }
    };
  }

  it('should save and load a normalized draft payload', () => {
    const memoryStorage = createMemoryStorage();
    const draft = draftStore.saveDraft({
      previewDataUrl: 'data:image/png;base64,abc',
      activeLayerId: 'hair',
      layers: layers.createLayerPayload({
        hair: {
          canvasJson: { version: '6.7.1', objects: [{ type: 'Line', layerId: 'hair' }] }
        }
      })
    }, memoryStorage, {
      nowProvider: () => 123456
    });

    const loaded = draftStore.loadDrafts(memoryStorage);

    expect(draft.id).to.equal('draft-123456');
    expect(loaded).to.have.length(1);
    expect(loaded[0].activeLayerId).to.equal('hair');
    expect(loaded[0].layers.hair.canvasJson.objects).to.have.length(1);
  });

  it('should trim drafts to the requested maximum and keep latest first', () => {
    const memoryStorage = createMemoryStorage();

    draftStore.saveDraft({ previewDataUrl: 'one', canvasJson: { version: '6.7.1', objects: [] } }, memoryStorage, {
      nowProvider: () => 1,
      maxDrafts: 2
    });
    draftStore.saveDraft({ previewDataUrl: 'two', canvasJson: { version: '6.7.1', objects: [] } }, memoryStorage, {
      nowProvider: () => 2,
      maxDrafts: 2
    });
    draftStore.saveDraft({ previewDataUrl: 'three', canvasJson: { version: '6.7.1', objects: [] } }, memoryStorage, {
      nowProvider: () => 3,
      maxDrafts: 2
    });

    const loaded = draftStore.loadDrafts(memoryStorage);

    expect(loaded.map((entry) => entry.previewDataUrl)).to.deep.equal(['three', 'two']);
  });

  it('should preserve stored timestamps when loading drafts', () => {
    const memoryStorage = createMemoryStorage();
    memoryStorage.setItem('agar.playerCardDrafts', JSON.stringify([{
      id: 'draft-1',
      previewDataUrl: 'one',
      canvasJson: { version: '6.7.1', objects: [] },
      activeLayerId: 'base',
      contentScale: 1,
      layers: layers.createLayerPayload(),
      createdAt: '2026-04-22T00:00:00.000Z',
      updatedAt: '2026-04-22T01:00:00.000Z'
    }]));

    const loaded = draftStore.loadDrafts(memoryStorage);

    expect(loaded[0].createdAt).to.equal('2026-04-22T00:00:00.000Z');
    expect(loaded[0].updatedAt).to.equal('2026-04-22T01:00:00.000Z');
  });
});
