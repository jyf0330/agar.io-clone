/*jshint expr:true */

const expect = require('chai').expect;
const avatarSkeletonLoader = require('../../apps/client/src/avatar-skeleton-loader');

describe('avatar-skeleton-loader.js', () => {
  it('should resolve npc personality skeleton aliases to player-like skeleton images', () => {
    const skeleton = avatarSkeletonLoader.getSkeletonByKey('skeleton-b-blob');

    expect(skeleton).to.not.equal(null);
    expect(skeleton.skeletonKey).to.equal('b');
  });
});
