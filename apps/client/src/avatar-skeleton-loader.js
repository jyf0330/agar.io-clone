'use strict';

function getAssetUrl(asset) {
    return asset && asset.default ? asset.default : asset;
}

var SKELETON_SOURCES = {
    a: getAssetUrl(require('../../../demo/assets/skeleton-bases/skeleton-a-doll.png')),
    b: getAssetUrl(require('../../../demo/assets/skeleton-bases/skeleton-b-blob.png')),
    c: getAssetUrl(require('../../../demo/assets/skeleton-bases/skeleton-c-ghost.png')),
    d: getAssetUrl(require('../../../demo/assets/skeleton-bases/skeleton-d-robot.png')),
    e: getAssetUrl(require('../../../demo/assets/skeleton-bases/skeleton-e-bean.png')),
    f: getAssetUrl(require('../../../demo/assets/skeleton-bases/skeleton-f-turtle.png'))
};

var PLAYER_SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e'];
var DEFAULT_SKELETON_SIZE = 320;
var skeletonImages = {};

function createSkeletonImage(key, src) {
    if (typeof Image === 'undefined') {
        return {
            complete: true,
            naturalWidth: DEFAULT_SKELETON_SIZE,
            naturalHeight: DEFAULT_SKELETON_SIZE,
            skeletonKey: key,
            src: src
        };
    }

    var image = new Image();
    image.skeletonKey = key;
    image.src = src;
    return image;
}

function waitForImage(image) {
    if (!image || image.complete) {
        return Promise.resolve(image);
    }

    return new Promise(function (resolve) {
        function finish() {
            resolve(image);
        }

        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
    });
}

function preloadSkeletons() {
    return Promise.all(Object.keys(skeletonImages).map(function (key) {
        return waitForImage(skeletonImages[key]);
    }));
}

Object.keys(SKELETON_SOURCES).forEach(function (key) {
    skeletonImages[key] = createSkeletonImage(key, SKELETON_SOURCES[key]);
});

preloadSkeletons();

function getRandomSkeleton() {
    var key = PLAYER_SKELETON_KEYS[Math.floor(Math.random() * PLAYER_SKELETON_KEYS.length)];
    return getSkeletonByKey(key);
}

function getSkeletonByKey(key) {
    return skeletonImages[key] || null;
}

module.exports = {
    getRandomSkeleton: getRandomSkeleton,
    getSkeletonByKey: getSkeletonByKey
};
