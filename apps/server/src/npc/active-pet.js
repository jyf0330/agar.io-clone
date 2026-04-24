'use strict';

function getActivePetId(player) {
    return player && player.activePet ? player.activePet.petId || player.activePet.npcId || null : null;
}

function getActiveNpc(npcRoster, player, options) {
    const roster = Array.isArray(npcRoster) ? npcRoster : [];
    const settings = options || {};
    const activePetId = getActivePetId(player);
    const matchedNpc = roster.find((npc) => npc && npc.id === activePetId) || null;

    if (matchedNpc) {
        return matchedNpc;
    }

    return settings.fallbackToFirst === false ? null : (roster[0] || null);
}

module.exports = {
    getActiveNpc: getActiveNpc,
    getActivePetId: getActivePetId
};
