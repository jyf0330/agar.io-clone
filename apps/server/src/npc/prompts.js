'use strict';

function formatBehaviorSummary(npc) {
    const personality = npc && npc.personality ? npc.personality : {};
    const behavior = personality.behavior || {};

    return [
        '原型：' + (personality.archetype || '未定义'),
        '说话：' + (behavior.speech_style || '未定义'),
        '移动：' + (behavior.movement || '未定义'),
        '涂画：' + (behavior.painting_preference || '未定义')
    ].join('\n');
}

function formatOtherNpcSummary(context, currentNpcId) {
    const rows = (context || []).filter((entry) => entry.npcId !== currentNpcId);
    if (!rows.length) {
        return '暂无其他 NPC。';
    }

    return rows.map((entry) => {
        return entry.npcName + '（' + entry.archetype + '）正在 ' + entry.currentIntent + '。';
    }).join(' ');
}

function formatRecentChats(recentChats) {
    const rows = Array.isArray(recentChats) ? recentChats.slice(-5) : [];
    if (!rows.length) {
        return '最近没有玩家聊天。';
    }

    return rows.map((entry) => {
        return (entry.playerName || '玩家') + '：' + (entry.message || '');
    }).join('\n');
}

function buildNpcIntentPrompt(npcs, batchContext) {
    const npcList = Array.isArray(npcs) ? npcs : [npcs];
    const contexts = Array.isArray(batchContext) ? batchContext : [batchContext];
    const anchorSections = npcList.map((npc) => {
        return [
            'NPC: ' + npc.player.name + ' (' + npc.id + ')',
            formatBehaviorSummary(npc),
            npc.personality.anchorsText || ''
        ].join('\n');
    }).join('\n\n');

    const sceneSections = contexts.map((entry) => {
        return [
            'NPC: ' + entry.npcName + ' (' + entry.npcId + ')',
            '当前场景：',
            '  - 时间：' + entry.time_of_day,
            '  - 回合阶段：' + entry.round_phase,
            '  - 剩余秒数：' + entry.round_remaining_sec,
            '  - 你的位置：(' + entry.npc.x + ', ' + entry.npc.y + ')',
            '  - 玩家位置：(' + entry.player.x + ', ' + entry.player.y + ')',
            '  - 玩家刚才做的事：' + entry.last_player_action,
            '  - 你的原型：' + entry.archetype,
            '  - 你的行为摘要：' + entry.behavior_summary,
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
            '  "npcId": "mochi",',
            '  "intent": "move_to" | "idle" | "speak" | "paint",',
            '  "params": { "x": 0, "y": 0, "targetId": "human" },',
            '  "reason": "一句话，不超过 15 字"',
            '}',
            '多只 NPC 时，输出 JSON 数组，顺序与输入上下文一致。',
            '请优先让 3 只 NPC 保持明显差异：doudou 更快更爱说话，wugui 稳重且只在局末才考虑 paint，mochi 慢且更安静。'
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

function buildNpcReplyPrompt(npcs, recentChats, playerMessage) {
    const npcList = Array.isArray(npcs) ? npcs : [npcs];
    const latestMessage = playerMessage || {};
    const anchorSections = npcList.map((npc) => {
        return [
            'NPC: ' + npc.player.name + ' (' + npc.id + ')',
            formatBehaviorSummary(npc),
            npc.personality.anchorsText || ''
        ].join('\n');
    }).join('\n\n');

    return {
        system: [
            '你要分别扮演 3 个 NPC 回复玩家。',
            '必须严格遵循下面的人设锚点，不要串味：',
            anchorSections
        ].join('\n\n'),
        user: [
            '最近聊天记录：',
            formatRecentChats(recentChats),
            '玩家最新一句：' + (latestMessage.message || ''),
            '请输出 JSON 数组，不要加解释。',
            '格式：',
            '[',
            '  {"npcId":"mochi","text":"不超过 15 字"},',
            '  {"npcId":"doudou","text":"不超过 15 字"},',
            '  {"npcId":"wugui","text":"不超过 15 字"}',
            ']',
            '如果某个 NPC 不想回应，也要保留该项并把 text 设为 "不回复"。',
            '如果玩家在问颜色，mochi 偏冷色，doudou 可以顽皮乱答，wugui 稳重回答。',
            '如果玩家在喊你过来，至少 1 只 NPC 的语气里要体现愿意靠近。'
        ].join('\n'),
        maxTokens: 120,
        temperature: 0.65
    };
}

module.exports = {
    buildNpcIntentPrompt: buildNpcIntentPrompt,
    buildNpcUtterPrompt: buildNpcUtterPrompt,
    buildNpcReplyPrompt: buildNpcReplyPrompt
};
