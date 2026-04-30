'use strict';

function getAssetUrl(asset) {
    return asset && asset.default ? asset.default : asset;
}

function loadAsset(assetLoader, assetPath) {
    try {
        return getAssetUrl(assetLoader());
    } catch (error) {
        return assetPath;
    }
}

var SKELETON_SOURCES = {
    a: loadAsset(function () { return require('../../../demo/assets/skeleton-bases/skeleton-a-doll.png'); }, '../../../demo/assets/skeleton-bases/skeleton-a-doll.png'),
    b: loadAsset(function () { return require('../../../demo/assets/skeleton-bases/skeleton-b-blob.png'); }, '../../../demo/assets/skeleton-bases/skeleton-b-blob.png'),
    c: loadAsset(function () { return require('../../../demo/assets/skeleton-bases/skeleton-c-ghost.png'); }, '../../../demo/assets/skeleton-bases/skeleton-c-ghost.png'),
    d: loadAsset(function () { return require('../../../demo/assets/skeleton-bases/skeleton-d-robot.png'); }, '../../../demo/assets/skeleton-bases/skeleton-d-robot.png'),
    e: loadAsset(function () { return require('../../../demo/assets/skeleton-bases/skeleton-e-bean.png'); }, '../../../demo/assets/skeleton-bases/skeleton-e-bean.png'),
    f: loadAsset(function () { return require('../../../demo/assets/skeleton-bases/skeleton-f-turtle.png'); }, '../../../demo/assets/skeleton-bases/skeleton-f-turtle.png')
};

var PLAYER_SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e'];
var SKELETON_KEY_ALIASES = {
    'skeleton-a-doll': 'a',
    'skeleton-b-blob': 'b',
    'skeleton-c-ghost': 'c',
    'skeleton-d-robot': 'd',
    'skeleton-e-bean': 'e',
    'skeleton-f-turtle': 'f'
};
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
    var normalizedKey = SKELETON_KEY_ALIASES[key] || key;
    return skeletonImages[normalizedKey] || null;
}

module.exports = {
    getRandomSkeleton: getRandomSkeleton,
    getSkeletonByKey: getSkeletonByKey
};
