/*jshint expr:true */

const expect = require('chai').expect;
const preview = require('../../apps/client/src/avatar-draft-preview');

describe('avatar-draft-preview.js', () => {
  it('should return null when document is unavailable', () => {
    expect(preview.createDraftPreviewDataUrl({
      fullShapeData: { objects: [] },
      missingPartType: 'hair'
    })).to.equal(null);
  });
});
