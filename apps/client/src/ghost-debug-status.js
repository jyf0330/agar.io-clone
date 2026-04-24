'use strict';

function formatGhostDebugStatus(player) {
    const debug = player && player.ghostDebug;
    if (!debug || !debug.enabled) {
        return '';
    }

    const anchors = debug.anchors || [];
    const upcomingAnchors = anchors.filter((anchor) => anchor.inTimeWindow).length;
    return [
        '<br />历史回响调试：',
        'active ' + (debug.activeGhostCount || 0) + '/' + (debug.maxActiveGhosts || 0),
        'anchors ' + anchors.length,
        'window ' + Math.round((debug.timeWindowMs || 0) / 1000) + 's',
        'radius ' + Math.round(debug.triggerRadius || 0),
        'ready ' + upcomingAnchors
    ].join(' ');
}

module.exports = formatGhostDebugStatus;
