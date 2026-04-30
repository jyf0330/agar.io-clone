/*jshint expr:true */

const expect = require('chai').expect;
const avatarRuntimeRender = require('../../apps/client/src/avatar-runtime-render');

describe('avatar-runtime-render.js', () => {
  it('should only enable custom runtime rendering when a preview exists and the flag is on', () => {
    expect(avatarRuntimeRender.shouldUseAvatarRuntimeRender({
      playerCardPreviewDataUrl: 'data:image/png;base64,abc'
    }, {
      useOuterRingSkin: true,
      fallbackToLegacyPlayerRender: true
    }, false)).to.equal(true);
  });

  it('should enable custom runtime rendering for npc skeleton avatars', () => {
    expect(avatarRuntimeRender.shouldUseAvatarRuntimeRender({
      isNpc: true,
      skeletonKey: 'skeleton-b-blob'
    }, {
      useOuterRingSkin: true,
      fallbackToLegacyPlayerRender: true
    }, false)).to.equal(true);
  });

  it('should fall back to legacy rendering when touching borders and fallback is enabled', () => {
    expect(avatarRuntimeRender.shouldUseAvatarRuntimeRender({
      playerCardPreviewDataUrl: 'data:image/png;base64,abc'
    }, {
      useOuterRingSkin: true,
      fallbackToLegacyPlayerRender: true
    }, true)).to.equal(false);
  });

  it('should derive a smaller inner avatar radius from the cell radius', () => {
    expect(avatarRuntimeRender.getAvatarInnerRadius({ radius: 100 })).to.equal(72);
  });
});
