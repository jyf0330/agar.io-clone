module.exports = {
    host: "0.0.0.0",
    port: 3000,
    logpath: "logger.php",
    foodMass: 1,
    fireFood: 20,
    limitSplit: 16,
    defaultPlayerMass: 10,
    virus: {
        fill: "#33ff33",
        stroke: "#19D119",
        strokeWidth: 20,
        defaultMass: {
            from: 100,
            to: 150
        },
        splitMass: 180,
        uniformDisposition: false,
    },
    gameWidth: 5000,
    gameHeight: 5000,
    mapId: 'fixed-arena',
    adminPass: "DEFAULT",
    gameMass: 20000,
    maxFood: 1000,
    maxVirus: 50,
    partLoot: {
        enabled: true,
        maxWorldParts: 8,
        spawnBatch: 1,
        templates: [
            {
                type: 'HAND',
                templateId: 'hand-open',
                displayName: 'Map Hand',
                stats: {
                    pickupRange: 10
                }
            },
            {
                type: 'FOOT',
                templateId: 'foot-default',
                displayName: 'Map Foot',
                stats: {
                    moveSpeed: 10
                }
            },
            {
                type: 'HEAD',
                templateId: 'head-default',
                displayName: 'Map Head',
                stats: {
                    echoDetectRange: 10
                }
            }
        ]
    },
    ghostEcho: {
        timeWindowMs: 30000,
        triggerRadius: 800,
        maxActiveGhosts: 3,
        anchorCooldownMs: 60000,
        followTimeoutMs: 30000,
        debug: false
    },
    slowBase: 4.5,
    logChat: 0,
    networkUpdateFactor: 40,
    maxHeartbeatInterval: 5000,
    foodUniformDisposition: true,
    newPlayerInitialPosition: "farthest",
    massLossRate: 1,
    minMassLoss: 50,
    sqlinfo: {
        fileName: "db.sqlite3",
    }
};
