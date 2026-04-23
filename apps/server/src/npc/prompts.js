'use strict';

function formatOtherNpcSummary(context, currentNpcId) {
    const rows = (context || []).filter((entry) => entry.npcId !== currentNpcId);
    if (!rows.length) {
        return '暂无其他 NPC。';
    }

    return rows.map((entry) => {
        return entry.npcName + ' 正在 ' + entry.currentIntent + '。';
    }).join(' ');
}

function buildNpcIntentPrompt(npcs, batchContext) {
    const npcList = Array.isArray(npcs) ? npcs : [npcs];
    const contexts = Array.isArray(batchContext) ? batchContext : [batchContext];
    const anchorSections = npcList.map((npc) => {
        return [
            'NPC: ' + npc.player.name + ' (' + npc.id + ')',
            npc.personality.anchorsText || ''
        ].join('\n');
    }).join('\n\n');

    const sceneSections = contexts.map((entry) => {
        return [
            'NPC: ' + entry.npcName + ' (' + entry.npcId + ')',
            '当前场景：',
            '  - 时间：' + entry.time_of_day,
            '  - 你的位置：(' + entry.npc.x + ', ' + entry.npc.y + ')',
            '  - 玩家位置：(' + entry.player.x + ', ' + entry.player.y + ')',
            '  - 玩家刚才做的事：' + entry.last_player_action,
            '  - 其他 NPC 在做什么：' + formatOtherNpcSummary(contexts, entry.npcId),
            '  - 你现在的意图：' + entry.currentIntent
        ].join('\n');
    }).join('\n\n');

    return {
        system: [
            '你是游戏里的 NPC，人设如下（必须严格遵循）：',
            anchorSections
        ].join('\n\n'),
        user: [
            sceneSections,
            '请输出一个 intent（JSON 格式，不要加其它文字）。',
            '只有 1 只 NPC 时，输出单个对象：',
            '{',
            '  "intent": "move_to" | "idle" | "speak" | "paint",',
            '  "params": { "x": 0, "y": 0 },',
            '  "reason": "一句话，不超过 15 字"',
            '}',
            '多只 NPC 时，输出 JSON 数组，顺序与输入上下文一致。'
        ].join('\n')
    };
}

function buildNpcUtterPrompt(npc, context) {
    const safeContext = context || {};

    return {
        system: [
            '你是游戏里的 NPC，人设如下（必须严格遵循）：',
            npc.personality.anchorsText || ''
        ].join('\n\n'),
        user: [
            '请根据当前情境说一句中文，长度不超过 15 字。',
            '当前时间：' + safeContext.timeOfDay,
            '玩家位置：(' + safeContext.playerX + ', ' + safeContext.playerY + ')',
            '你的位置：(' + safeContext.npcX + ', ' + safeContext.npcY + ')',
            '你现在的动作：' + safeContext.intentType,
            '只输出一句话，不要解释。'
        ].join('\n'),
        maxTokens: 60,
        temperature: 0.7
    };
}

module.exports = {
    buildNpcIntentPrompt: buildNpcIntentPrompt,
    buildNpcUtterPrompt: buildNpcUtterPrompt
};
