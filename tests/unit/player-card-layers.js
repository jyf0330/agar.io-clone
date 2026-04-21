/*jshint expr:true */

const expect = require('chai').expect;
const layers = require('../../apps/client/src/player-card-layers');

describe('player-card-layers.js', () => {
  it('should always create the fixed base/eyes/hair structure', () => {
    const payload = layers.createLayerPayload();

    expect(Object.keys(payload)).to.deep.equal(['base', 'eyes', 'hair']);
    expect(payload.base.visible).to.equal(true);
    expect(payload.eyes.locked).to.equal(false);
    expect(payload.hair.canvasJson.objects).to.deep.equal([]);
  });

  it('should place legacy content into the base layer', () => {
    const legacy = layers.createLegacyLayerPayload({
      version: '6.7.1',
      objects: [{ type: 'Rect', left: 1 }]
    });

    expect(legacy.base.canvasJson.objects).to.have.length(1);
    expect(legacy.eyes.canvasJson.objects).to.have.length(0);
    expect(legacy.hair.canvasJson.objects).to.have.length(0);
  });

  it('should merge and split layer payloads by layerId', () => {
    const merged = layers.mergeLayerPayloadToCanvasJson({
      base: { canvasJson: { version: '6.7.1', objects: [{ type: 'Rect', layerId: 'base' }] } },
      eyes: { canvasJson: { version: '6.7.1', objects: [{ type: 'Circle', layerId: 'eyes' }] } },
      hair: { canvasJson: { version: '6.7.1', objects: [{ type: 'Line', layerId: 'hair' }] } }
    });
    const split = layers.splitCanvasJsonByLayer(merged);

    expect(merged.objects).to.have.length(3);
    expect(split.base.canvasJson.objects).to.have.length(1);
    expect(split.eyes.canvasJson.objects).to.have.length(1);
    expect(split.hair.canvasJson.objects).to.have.length(1);
  });

  it('should keep visible layers fully opaque and only gate editability by active state', () => {
    const activeVisible = layers.getLayerRenderState({ visible: true, locked: false }, true);
    const inactiveVisible = layers.getLayerRenderState({ visible: true, locked: false }, false);
    const hiddenLayer = layers.getLayerRenderState({ visible: false, locked: false }, false);

    expect(activeVisible).to.deep.equal({ visible: true, editable: true, opacity: 1 });
    expect(inactiveVisible).to.deep.equal({ visible: true, editable: false, opacity: 1 });
    expect(hiddenLayer).to.deep.equal({ visible: false, editable: false, opacity: 0 });
  });

  it('should serialize Fabric canvas data with layerId included', () => {
    let capturedArgs = null;
    const canvas = {
      toJSON(args) {
        capturedArgs = args;
        return { version: '6.7.1', objects: [] };
      }
    };

    const result = layers.serializeCanvas(canvas);

    expect(capturedArgs).to.deep.equal(['layerId']);
    expect(result).to.deep.equal({ version: '6.7.1', objects: [] });
  });
});
