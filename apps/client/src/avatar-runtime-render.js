'use strict';

function shouldUseAvatarRuntimeRender(cell, config, isTouchingBorders) {
    if (!config || !config.useOuterRingSkin) {
        return false;
    }

    if (!cell) {
        return false;
    }

    if (!cell.playerCardPreviewDataUrl && !(cell.isNpc && cell.skeletonKey)) {
        return false;
    }

    if (isTouchingBorders && config.fallbackToLegacyPlayerRender) {
        return false;
    }

    return true;
}

function getAvatarInnerRadius(cell) {
    return cell.radius * 0.72;
}

module.exports = {
    shouldUseAvatarRuntimeRender: shouldUseAvatarRuntimeRender,
    getAvatarInnerRadius: getAvatarInnerRadius
};
