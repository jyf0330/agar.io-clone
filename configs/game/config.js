const demoModeEnabled = process.env.V5_DEMO_MODE === '1';
const persistedGhostHistoryEnabled = process.env.V5_GHOST_PERSISTENCE === '1';
const ghostTraceRecordingEnabled = process.env.V5_GHOST_TRACE_RECORDING === '1';
const networkUpdateFactor = Number(process.env.V5_NETWORK_UPDATE_FACTOR || 20);
const botMovementUpdateIntervalMs = Number(process.env.V5_BOT_MOVEMENT_UPDATE_INTERVAL_MS || 250);
const balancePresets = require('./balance-presets');
const defaultRoundDurationMs = 8 * 60 * 1000;
const npcModeEnabled = process.env.V5_NPC_ENABLED === '1';
const ghostEchoEnabled = process.env.V5_GHOST_ENABLED === '1';
const petModeEnabled = process.env.V5_PET_ENABLED === '1';
const requestedBalancePreset = process.env.V5_BALANCE_PRESET
    || (demoModeEnabled ? 'demo' : 'standard');
const balancePresetName = Object.prototype.hasOwnProperty.call(balancePresets, requestedBalancePreset)
    ? requestedBalancePreset
    : 'standard';

function mergeDeep(target, source) {
    Object.keys(source || {}).forEach((key) => {
        const value = source[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            target[key] = mergeDeep(Object.assign({}, target[key] || {}), value);
            return;
        }
        target[key] = value;
    });
    return target;
}

const config = {
    balancePreset: balancePresetName,
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
            },
            {
                type: 'HEART',
                templateId: 'heart-default',
                displayName: 'Map Heart',
                stats: {
                    resonanceIntimacy: 1
                }
            }
        ]
    },
    ghostEcho: {
        enabled: ghostEchoEnabled,
        timeWindowMs: 30000,
        triggerRadius: 800,
        maxActiveGhosts: 3,
        anchorCooldownMs: 60000,
        followTimeoutMs: 30000,
        debug: false,
        persistedHistory: persistedGhostHistoryEnabled,
        recordPlayerTraces: ghostTraceRecordingEnabled,
        eventRefreshIntervalMs: 2000
    },
    demo: {
        enabled: demoModeEnabled,
        roundDurationMs: defaultRoundDurationMs,
        showNearbyEchoHint: demoModeEnabled
    },
    npc: {
        enabled: npcModeEnabled,
        tickIntervalMs: 2000,
        memoryFinalizeIntervalMs: 5000,
        relationshipRefreshIntervalMs: 30000,
        relationshipCacheTtlMs: 30000,
        memoryCacheTtlMs: 10000,
        recordLlmIntents: process.env.V5_NPC_RECORD_LLM_INTENTS === '1',
        recordRoutineIntents: process.env.V5_NPC_RECORD_ROUTINE_INTENTS === '1',
        useMemoryInRoutineTicks: process.env.V5_NPC_ROUTINE_MEMORY === '1',
        routineIntentRecordIntervalMs: 10000
    },
    pet: {
        enabled: petModeEnabled
    },
    botPlayers: {
        competitive: process.env.V5_BOT_PLAYERS_COMPETITIVE === '0' ? false : true
    },
    balanceTelemetry: {
        enabled: process.env.V5_BALANCE_TELEMETRY === '1',
        snapshotIntervalMs: Number(process.env.V5_BALANCE_SNAPSHOT_INTERVAL_MS || 1000)
    },
    sync: {
        playerMetaUpdateIntervalMs: 2000,
        spectatorUpdateIntervalMs: 100,
        botMovementUpdateIntervalMs: botMovementUpdateIntervalMs,
        metricsEnabled: process.env.V5_SYNC_METRICS === '1',
        metricsIntervalMs: 5000
    },
    slowBase: 4.5,
    logChat: 0,
    networkUpdateFactor: networkUpdateFactor,
    maxHeartbeatInterval: 5000,
    foodUniformDisposition: true,
    newPlayerInitialPosition: "farthest",
    massLossRate: 1,
    minMassLoss: 50,
    sqlinfo: {
        fileName: "db.sqlite3",
    }
};

mergeDeep(config, balancePresets[balancePresetName]);

module.exports = config;
