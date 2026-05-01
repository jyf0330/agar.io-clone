'use strict';

const MINUTE = 60 * 1000;

module.exports = {
    standard: {
        demo: {
            enabled: false,
            roundDurationMs: 12 * MINUTE,
            showNearbyEchoHint: false
        },
        partLoot: {
            maxWorldParts: 10,
            spawnBatch: 2
        },
        ghostEcho: {
            timeWindowMs: 45000,
            triggerRadius: 1000,
            maxActiveGhosts: 4,
            anchorCooldownMs: 45000,
            followTimeoutMs: 35000,
            debug: false
        }
    },
    demo: {
        demo: {
            enabled: true,
            roundDurationMs: 8 * MINUTE,
            showNearbyEchoHint: true
        },
        partLoot: {
            maxWorldParts: 14,
            spawnBatch: 3
        },
        ghostEcho: {
            timeWindowMs: 60000,
            triggerRadius: 1200,
            maxActiveGhosts: 5,
            anchorCooldownMs: 15000,
            followTimeoutMs: 45000,
            debug: true
        }
    },
    long: {
        demo: {
            enabled: false,
            roundDurationMs: 45 * MINUTE,
            showNearbyEchoHint: false
        },
        partLoot: {
            maxWorldParts: 18,
            spawnBatch: 2
        },
        ghostEcho: {
            timeWindowMs: 90000,
            triggerRadius: 1400,
            maxActiveGhosts: 8,
            anchorCooldownMs: 60000,
            followTimeoutMs: 60000,
            debug: false
        }
    }
};
