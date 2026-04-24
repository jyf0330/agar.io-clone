'use strict';

function formatPetStatus(player) {
    const pet = player && player.activePet;
    if (!pet || !pet.active) {
        return '';
    }

    return '<br />跟宠：' + (pet.name || pet.petId || '未知') + ' (' + (pet.personality || pet.petId || 'pet') + ')';
}

module.exports = formatPetStatus;
