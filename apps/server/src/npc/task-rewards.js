"use strict";

const body = require('../body');

function createNpcTaskRewardPart(options) {
    const settings = options || {};
    return body.createBodyPart(settings.type || 'HAND', 1, {
        templateId: settings.templateId || 'hand-thread',
        source: 'npc-task',
        taskId: settings.taskId || 'find-echo-hand',
        npcId: settings.npcId || '',
        signatureBonus: {
            connectionRangeBonus: 15
        }
    });
}

function recordReward(memoryStore, payload) {
    if (!memoryStore || typeof memoryStore.recordEvent !== 'function') {
        return;
    }

    memoryStore.recordEvent({
        playerId: payload.player.id,
        npcId: payload.npcId,
        sessionId: payload.sessionId,
        kind: 'npc_task_reward',
        payload: {
            taskId: payload.taskId,
            npcName: payload.npcName,
            part: payload.part,
            x: payload.position.x,
            y: payload.position.y
        },
        ts: Date.now()
    });
}

function grantNpcTaskReward(options) {
    const settings = options || {};
    const npc = settings.npc || {};
    const player = settings.player;
    const taskId = settings.taskId || 'find-echo-hand';
    const npcId = npc.id || settings.npcId || '';
    const position = {
        x: player.x,
        y: player.y
    };
    const part = createNpcTaskRewardPart({
        taskId: taskId,
        npcId: npcId,
        templateId: settings.templateId,
        type: settings.type
    });
    const loot = settings.map.partLoot.addPart(part, position, 'npc-task');

    recordReward(settings.memoryStore, {
        player: player,
        npcId: npcId,
        npcName: npc.player && npc.player.name ? npc.player.name : npcId,
        sessionId: settings.sessionId || '',
        taskId: taskId,
        part: part,
        position: position
    });

    return {
        part: part,
        loot: loot
    };
}

function isTaskRewardRequest(message) {
    return /任务|奖励|部位|找东西|找手/.test(String(message || ''));
}

module.exports = {
    createNpcTaskRewardPart,
    grantNpcTaskReward,
    isTaskRewardRequest
};
