'use strict';

const fs = require('fs');
const path = require('path');

function resolveBalanceDir() {
    return process.env.BALANCE_AUDIT_DIR || path.resolve(process.cwd(), 'data/balance');
}

function toDateStamp(value) {
    return new Date(value).toISOString().slice(0, 10);
}

function getBalanceFilePath(timestamp) {
    return path.join(resolveBalanceDir(), toDateStamp(timestamp || Date.now()) + '.jsonl');
}

function appendJsonl(entry) {
    const ts = entry && entry.ts ? entry.ts : Date.now();
    const auditDir = resolveBalanceDir();
    const filePath = getBalanceFilePath(ts);
    fs.mkdirSync(auditDir, { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
    return filePath;
}

function countList(value) {
    return value && Array.isArray(value.data) ? value.data.length : 0;
}

function getArray(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value;
    }
    return Array.isArray(value.data) ? value.data : [];
}

function compactPlayer(player) {
    return {
        id: player.id,
        name: player.name || '',
        massTotal: Math.round((player.massTotal || 0) * 100) / 100,
        cellCount: Array.isArray(player.cells) ? player.cells.length : 0,
        bodyPartCount: player.bodyPartCount || 0,
        bodyPartCounts: Object.assign({}, player.bodyPartCounts || {}),
        materialization: player.materialization || 0,
        materializationStage: player.materializationStage || ''
    };
}

function createEmitter(options) {
    const settings = options || {};
    const sink = settings.sink;

    if (typeof sink === 'function') {
        return sink;
    }
    if (Array.isArray(sink)) {
        return function emitToArray(event) {
            sink.push(event);
        };
    }
    return function noop() {};
}

function createBalanceTelemetry(options) {
    const settings = options || {};
    const enabled = settings.enabled === true;
    const now = typeof settings.now === 'function' ? settings.now : Date.now;
    const emit = createEmitter(settings);

    function record(event) {
        if (!enabled) {
            return;
        }
        emit(Object.assign({
            ts: now()
        }, event));
    }

    function recordWorldSnapshot(context) {
        const snapshot = context || {};
        const map = snapshot.map || {};
        const players = getArray(map.players).filter((player) => !player.isNpc);
        const massFood = getArray(map.massFood);

        record({
            eventType: 'balance_world_snapshot',
            balancePreset: snapshot.balancePreset || 'standard',
            elapsedMs: snapshot.roundTimer && snapshot.roundTimer.elapsedMs || 0,
            remainingMs: snapshot.roundTimer && snapshot.roundTimer.remainingMs || 0,
            playerCount: players.length,
            foodCount: countList(map.food),
            virusCount: countList(map.viruses),
            massFoodCount: massFood.length,
            massFoodTotal: massFood.reduce((total, item) => total + (item.mass || 0), 0),
            partLootCount: countList(map.partLoot),
            ghostCount: getArray(map.ghosts).length,
            players: players.map(compactPlayer)
        });
    }

    function recordPartPickup(context) {
        const payload = context || {};
        const player = payload.player || {};
        const pickup = payload.pickup || {};
        const part = pickup.equippedPart || {};
        const loot = pickup.loot || {};

        record({
            eventType: 'balance_part_pickup',
            balancePreset: payload.balancePreset || 'standard',
            playerId: player.id || '',
            playerMassTotal: Math.round((player.massTotal || 0) * 100) / 100,
            playerBodyPartCount: player.bodyPartCount || 0,
            partType: part.partType || part.type || '',
            sourceType: part.sourceType || '',
            lootSource: loot.source || ''
        });
    }

    function recordDevour(context) {
        const payload = context || {};
        const eater = payload.eater || {};
        const victim = payload.victim || {};
        const stolenPart = payload.stolenPart || {};

        record({
            eventType: 'balance_player_devour',
            balancePreset: payload.balancePreset || 'standard',
            eaterId: eater.id || '',
            victimId: victim.id || '',
            eaterMassTotal: Math.round((eater.massTotal || 0) * 100) / 100,
            victimMassTotal: Math.round((victim.massTotal || 0) * 100) / 100,
            stolenPartType: stolenPart.partType || stolenPart.type || ''
        });
    }

    return {
        recordWorldSnapshot,
        recordPartPickup,
        recordDevour
    };
}

module.exports = {
    appendJsonl,
    createBalanceTelemetry,
    getBalanceFilePath,
    resolveBalanceDir
};
