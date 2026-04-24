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

function formatMemoryBlock(memory) {
    const safeMemory = memory || {};
    const summaries = Array.isArray(safeMemory.summaries) ? safeMemory.summaries.slice(0, 3) : [];
    const impression = safeMemory.impression && safeMemory.impression.impression
        ? safeMemory.impression.impression
        : '暂无长期画像。';
    const evidenceIds = safeMemory.impression && Array.isArray(safeMemory.impression.evidenceEventIds)
        ? safeMemory.impression.evidenceEventIds.slice(0, 8)
        : [];
    const summaryText = summaries.length
        ? summaries.map((summary, index) => {
            const expectation = summary.expectation ? ' 明天期望：' + String(summary.expectation).slice(0, 40) : '';
            return String(index + 1) + '. ' + String(summary.summary || '').slice(0, 80) + expectation;
        }).join('\n')
        : '暂无局末摘要。';

    return [
        '长期画像：' + String(impression).slice(0, 150),
        '长期画像证据事件：' + (evidenceIds.length ? evidenceIds.join(', ') : '暂无。'),
        '最近 3 局摘要：',
        summaryText
    ].join('\n');
}

function buildNpcIntentPrompt(npcs, batchContext) {
    const npcList = Array.isArray(npcs) ? npcs : [npcs];
    const contexts = Array.isArray(batchContext) ? batchContext : [batchContext];
    const anchorSections = npcList.map((npc) => {
        const context = contexts.find((entry) => entry.npcId === npc.id) || {};
        return [
            'NPC: ' + npc.player.name + ' (' + npc.id + ')',
            formatBehaviorSummary(npc),
            '记忆（只允许使用这些长期记忆，不要编造）：',
            formatMemoryBlock(context.memory),
            npc.personality.anchorsText || ''
        ].join('\n');
    }).join('\n\n');

    const sceneSections = contexts.map((entry) => {
        const petContext = entry.petContext || {};
        return [
            'NPC: ' + entry.npcName + ' (' + entry.npcId + ')',
            '当前场景：',
            '  - 时间：' + entry.time_of_day,
            '  - 回合阶段：' + entry.round_phase,
            '  - 剩余秒数：' + entry.round_remaining_sec,
            '  - 你的位置：(' + entry.npc.x + ', ' + entry.npc.y + ')',
            '  - 玩家位置：(' + entry.player.x + ', ' + entry.player.y + ')',
            '  - 玩家实体化阶段：' + (petContext.materializationStage || 'HOLLOW'),
            '  - 当前跟宠：' + (petContext.activePet && petContext.activePet.petId ? petContext.activePet.petId : 'unknown'),
            '  - 玩家装备：' + JSON.stringify(petContext.equipment || []),
            '  - 附近可拾取部位：' + JSON.stringify(petContext.nearbyPartLoot || []),
            '  - 即将触发的历史回响：' + JSON.stringify(petContext.upcomingEchoes || []),
            '  - 地图散落部位刷新倾向：' + JSON.stringify(petContext.mapPartSpawnTendency || {}),
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
            '记忆（只允许使用这些长期记忆，不要编造）：',
            formatMemoryBlock(safeContext.memory),
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

function buildNpcReplyPrompt(npcs, recentChats, playerMessage, memoryByNpc) {
    const npcList = Array.isArray(npcs) ? npcs : [npcs];
    const latestMessage = playerMessage || {};
    const anchorSections = npcList.map((npc) => {
        const memory = memoryByNpc && memoryByNpc[npc.id] ? memoryByNpc[npc.id] : null;
        return [
            'NPC: ' + npc.player.name + ' (' + npc.id + ')',
            formatBehaviorSummary(npc),
            '记忆（只允许使用这些长期记忆，不要编造）：',
            formatMemoryBlock(memory),
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

function formatPetContextBlock(petContext) {
    const context = petContext || {};

    return [
        '当前玩家装备：' + JSON.stringify(context.equipment || []),
        '当前实体化阶段：' + (context.materializationStage || 'HOLLOW'),
        '附近可拾取部位：' + JSON.stringify(context.nearbyPartLoot || []),
        '附近/即将触发的历史回响：' + JSON.stringify(context.upcomingEchoes || []),
        '地图散落部位刷新倾向：' + JSON.stringify(context.mapPartSpawnTendency || {}),
        '玩家短板部位：' + JSON.stringify(context.shortSlots || [])
    ].join('\n');
}

function buildPetQuestionPrompt(npc, playerMessage, petContext, memory) {
    return {
        system: [
            '你是玩家当前跟宠，只能回答真实上下文里存在的事实。',
            '不能编造地图热点、回声、部位、上局经历。',
            '如果事实不足，必须说不确定或给保守建议。',
            '人设锚点：',
            npc && npc.personality ? npc.personality.anchorsText || '' : '',
            '记忆（只允许使用这些长期记忆，不要编造）：',
            formatMemoryBlock(memory)
        ].join('\n\n'),
        user: [
            '玩家问：' + (playerMessage && playerMessage.message ? playerMessage.message : ''),
            '真实 petContext：',
            formatPetContextBlock(petContext),
            '请只输出一句中文，15 字以内。',
            '可回答类型：speak / hint_loot / hint_echo / move_to / 保守建议。',
            '涉及“上次”“记得”时，必须来自上面的记忆；没有记忆就说还没有共同记忆。'
        ].join('\n'),
        maxTokens: 80,
        temperature: 0.45
    };
}

function formatSessionEvents(events) {
    const rows = Array.isArray(events) ? events.slice(0, 50) : [];
    if (!rows.length) {
        return '本局没有可用事件。';
    }

    return rows.map((event) => {
        const payload = event.payload || {};
        const text = payload.text || payload.message || payload.reason || payload.type || '';
        return [
            '[' + (event.kind || 'event') + ']',
            '玩家=' + (event.playerId || 'unknown'),
            'NPC=' + (event.npcId || 'unknown'),
            text ? '内容=' + String(text).slice(0, 40) : ''
        ].filter(Boolean).join(' ');
    }).join('\n');
}

function buildSummarizeSessionPrompt(npc, events) {
    return {
        system: [
            '你是游戏局末记忆摘要器。',
            '必须从指定 NPC 的视角总结玩家本局互动。',
            '人设锚点：',
            npc && npc.personality ? npc.personality.anchorsText || '' : ''
        ].join('\n\n'),
        user: [
            '请输出一条中文摘要，最多 80 字。',
            '固定格式：{关系变化}, {玩家主色}, {3条具体事件}, {一句感受}',
            '不要编造事件，不要输出 JSON。',
            '本局事件：',
            formatSessionEvents(events)
        ].join('\n'),
        maxTokens: 120,
        temperature: 0.45
    };
}

function formatSessionSummaries(summaries) {
    const rows = Array.isArray(summaries) ? summaries.slice(0, 5) : [];
    if (!rows.length) {
        return '暂无局末摘要。';
    }

    return rows.map((summary, index) => {
        return String(index + 1) + '. ' + (summary.summary || '') + '（关系变化 ' + (summary.relationshipDelta || 0) + '）';
    }).join('\n');
}

function buildUpdatePersonaImpressionPrompt(npc, summaries, currentImpression) {
    return {
        system: [
            '你是长期人物画像压缩器。',
            '目标：把最近 5 局摘要压缩成稳定的人物画像，避免记忆膨胀。',
            '必须遵循 NPC 人设锚点：',
            npc && npc.personality ? npc.personality.anchorsText || '' : ''
        ].join('\n\n'),
        user: [
            '当前人物画像：' + (currentImpression && currentImpression.impression ? currentImpression.impression : '暂无'),
            '最近 5 局摘要：',
            formatSessionSummaries(summaries),
            '请输出 JSON，不要解释。',
            '格式：{"impression":"不超过150字，说明玩家偏好、互动方式、NPC对玩家的感觉","relationshipValue":0}',
            'relationshipValue 是 0-100 的整数。'
        ].join('\n'),
        maxTokens: 180,
        temperature: 0.4
    };
}

module.exports = {
    buildNpcIntentPrompt: buildNpcIntentPrompt,
    buildNpcUtterPrompt: buildNpcUtterPrompt,
    buildNpcReplyPrompt: buildNpcReplyPrompt,
    buildPetQuestionPrompt: buildPetQuestionPrompt,
    buildSummarizeSessionPrompt: buildSummarizeSessionPrompt,
    buildUpdatePersonaImpressionPrompt: buildUpdatePersonaImpressionPrompt,
    formatMemoryBlock: formatMemoryBlock
};
