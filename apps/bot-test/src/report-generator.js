'use strict';

const fs = require('fs');
const path = require('path');

const {BOT_STATES} = require('./constants');

const SUMMARY_EVENT_TYPES = new Set([
    '测试房间创建',
    '玩家加入',
    '连接服务器',
    '进入大厅',
    '请求开始游戏',
    '补全身体',
    '确认身体',
    '准备完成',
    '倒计时开始',
    '战斗开始',
    '战斗同步',
    '战斗行为',
    'ghost 出现/遭遇',
    '局内聊天',
    '战斗技能',
    'devour',
    '被 devour',
    'body part pickup',
    'body complete',
    '对局结束',
    '进入结算',
    '请求结算',
    '结算完成',
    '战斗行为缺失',
    '关键事件缺失',
    '异常',
    '超时'
]);
const PERIODIC_BATTLE_EVENT_TYPES = new Set([
    '战斗行为',
    '战斗技能'
]);
const CONTINUOUS_BOT_DATA_EVENT_TYPES = new Set([
    '战斗行为',
    '战斗技能'
]);
const PERIODIC_BATTLE_SAMPLE_INTERVAL_MS = 60 * 1000;
const MAX_TIMELINE_EVENTS = 160;
const REQUIRED_TIMELINE_EVENT_TYPES = new Set([
    'devour',
    '被 devour',
    'body part pickup',
    'body complete',
    '进入结算',
    '结算完成',
    '对局结束',
    '关键事件缺失'
]);

function includesAny(value, fragments) {
    const text = String(value || '');
    return fragments.some((fragment) => text.indexOf(fragment) !== -1);
}

function pad(value) {
    return String(value).padStart(2, '0');
}

function formatGameTime(ms) {
    const safeMs = Math.max(0, Number(ms) || 0);
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return pad(minutes) + ':' + pad(seconds);
}

function formatLastSuccess(event) {
    if (!event) {
        return '无';
    }
    return (event.type || '事件') + ' - ' + (event.message || '');
}

function readJsonlEvents(sessionDir) {
    const filePath = sessionDir ? path.join(sessionDir, 'raw_events.jsonl') : '';
    if (!filePath || !fs.existsSync(filePath)) {
        return [];
    }
    return fs.readFileSync(filePath, 'utf8')
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            try {
                return JSON.parse(line);
            } catch (_error) {
                return null;
            }
        })
        .filter(Boolean);
}

function normalizeEventText(event) {
    const safeEvent = event || {};
    if (safeEvent.type === '测试房间创建') {
        const botCount = safeEvent.data && safeEvent.data.botCount ? safeEvent.data.botCount : '';
        return botCount ? '创建测试房间，Bot 数=' + botCount : '创建测试房间';
    }
    if (safeEvent.type === '准备完成') {
        return '所有 Bot 已提交 gotit 并进入等待阶段';
    }
    if (safeEvent.type === '连接服务器') {
        const socketType = safeEvent.data && safeEvent.data.socketType ? safeEvent.data.socketType : '';
        return (socketType ? 'connect(type=' + socketType + ')：' : '') + (safeEvent.message || '连接服务器');
    }
    if (safeEvent.type === '进入大厅' || safeEvent.type === '请求开始游戏') {
        return safeEvent.message || safeEvent.type;
    }
    if (safeEvent.type === '战斗开始') {
        return safeEvent.message && safeEvent.message.indexOf('战斗开始') === -1
            ? '战斗开始：' + safeEvent.message
            : (safeEvent.message || '战斗开始');
    }
    if (safeEvent.type === '倒计时开始') {
        return safeEvent.message && safeEvent.message.indexOf('倒计时') === -1
            ? '倒计时开始：' + safeEvent.message
            : (safeEvent.message || '倒计时开始');
    }
    if (safeEvent.type === '玩家加入'
        || safeEvent.type === '补全身体'
        || safeEvent.type === '确认身体'
        || safeEvent.type === '战斗同步'
        || safeEvent.type === 'ghost 出现/遭遇'
        || safeEvent.type === 'devour'
        || safeEvent.type === '被 devour'
        || safeEvent.type === 'body part pickup'
        || safeEvent.type === 'body complete') {
        return safeEvent.message || safeEvent.type;
    }
    if (safeEvent.type === '战斗行为') {
        const source = safeEvent.data && safeEvent.data.targetSource ? safeEvent.data.targetSource : '';
        return source ? (safeEvent.message || '战斗行为') + '（' + source + '）' : (safeEvent.message || '战斗行为');
    }
    if (safeEvent.type === '局内聊天') {
        return '局内聊天：' + (safeEvent.message || '');
    }
    if (safeEvent.type === '战斗技能') {
        return safeEvent.message || '战斗技能';
    }
    if (safeEvent.type === '进入结算' || safeEvent.type === '结算完成' || safeEvent.type === '对局结束') {
        const endedReason = safeEvent.data && safeEvent.data.endedReason ? safeEvent.data.endedReason : '';
        return (safeEvent.message || safeEvent.type) + (endedReason ? '，endedReason=' + endedReason : '');
    }
    if (safeEvent.level === 'error') {
        return (safeEvent.type || '异常') + '：' + (safeEvent.message || '未知');
    }
    return safeEvent.message || safeEvent.type || '事件';
}

function getEventGameTime(event, battleStartedAt) {
    if (event && event.gameTime) {
        return event.gameTime;
    }
    if (!event || !event.time || !battleStartedAt) {
        return '准备阶段';
    }
    const eventTime = new Date(event.time).getTime();
    const startTime = new Date(battleStartedAt).getTime();
    if (!Number.isFinite(eventTime) || !Number.isFinite(startTime) || eventTime < startTime) {
        return '准备阶段';
    }
    return formatGameTime(eventTime - startTime);
}

function getEventTimeMs(event) {
    if (!event || !event.time) {
        return NaN;
    }
    const eventTime = new Date(event.time).getTime();
    return Number.isFinite(eventTime) ? eventTime : NaN;
}

function formatCoordinate(prefix, x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
        return '';
    }
    return prefix + '(' + Math.round(x) + ',' + Math.round(y) + ')';
}

function getEventPlace(event) {
    const data = event && event.data ? event.data : {};
    return formatCoordinate('玩家', data.x, data.y)
        || formatCoordinate('目标', data.targetX, data.targetY)
        || event.place
        || event.roomId
        || '';
}

function isRequiredTimelineEvent(event) {
    return Boolean(event && REQUIRED_TIMELINE_EVENT_TYPES.has(event.type));
}

function getRequiredTimelineCategory(event) {
    if (!event) {
        return '';
    }
    const data = event.data || {};
    const targetSource = data.targetSource || '';
    const message = event.message || '';

    if (event.type === '连接服务器' && data.socketType === 'player') {
        return 'player-flow-connect';
    }
    if (event.type === '进入大厅') {
        return 'player-flow-respawn';
    }
    if (event.type === '请求开始游戏' && includesAny(message, ['welcome'])) {
        return 'player-flow-welcome';
    }
    if (event.type === '补全身体') {
        return 'player-flow-body-selection';
    }
    if (event.type === '确认身体') {
        return 'player-flow-gotit';
    }
    if (event.type === '倒计时开始') {
        return 'countdown';
    }
    if (event.type === '战斗开始') {
        return 'battle-start';
    }
    if (event.type === '战斗行为') {
        if (includesAny(targetSource, ['可见食物']) || includesAny(message, ['移动追资源'])) {
            return 'battle-food';
        }
        if (includesAny(targetSource, ['随机巡航']) || includesAny(message, ['随机移动'])) {
            return 'battle-random-cruise';
        }
        if (includesAny(targetSource, ['避让大玩家']) || includesAny(message, ['避让大玩家'])) {
            return 'battle-avoid-larger';
        }
        if (includesAny(targetSource, ['追击小玩家']) || includesAny(message, ['追击小玩家'])) {
            return 'battle-pursue-smaller';
        }
        if (includesAny(targetSource, ['part loot']) || includesAny(message, ['part loot'])) {
            return 'battle-part-loot';
        }
        if (includesAny(targetSource, ['ghost']) || includesAny(message, ['ghost'])) {
            return 'battle-ghost';
        }
    }
    if (event.type === 'ghost 出现/遭遇') {
        return 'battle-ghost';
    }
    if (event.type === '战斗技能') {
        if (includesAny(message, ['吐孢子', 'eject', 'feed'])) {
            return 'skill-eject-mass';
        }
        if (includesAny(message, ['分裂', 'split'])) {
            return 'skill-split';
        }
        if (includesAny(message, ['连接'])) {
            return 'skill-connect';
        }
    }
    if (event.type === '局内聊天') {
        return 'battle-chat';
    }
    return '';
}

function capTimelineEvents(events) {
    const sourceEvents = events || [];
    if (sourceEvents.length <= MAX_TIMELINE_EVENTS) {
        return sourceEvents;
    }

    const selectedIndexes = new Set();
    const requiredIndexes = new Set();
    const requiredCategories = new Set();
    sourceEvents.forEach((event, index) => {
        if (isRequiredTimelineEvent(event)) {
            requiredIndexes.add(index);
        }
        const category = getRequiredTimelineCategory(event);
        if (category && !requiredCategories.has(category)) {
            requiredIndexes.add(index);
            requiredCategories.add(category);
        }
    });

    for (let index = 0; index < sourceEvents.length && selectedIndexes.size < MAX_TIMELINE_EVENTS; index += 1) {
        selectedIndexes.add(index);
    }
    requiredIndexes.forEach((index) => {
        selectedIndexes.add(index);
    });

    while (selectedIndexes.size > MAX_TIMELINE_EVENTS) {
        const removableIndex = Array.from(selectedIndexes)
            .sort((a, b) => b - a)
            .find((index) => !requiredIndexes.has(index));
        if (typeof removableIndex !== 'number') {
            break;
        }
        selectedIndexes.delete(removableIndex);
    }

    return Array.from(selectedIndexes)
        .sort((a, b) => a - b)
        .map((index) => sourceEvents[index]);
}

function buildKeyEvents(events) {
    const battleStart = (events || []).find((event) => event && event.type === '战斗开始' && !event.botId);
    const battleStartedAt = battleStart && battleStart.time;
    const seen = new Set();
    const lastBattleSampleAtByBot = {};
    const timelineEvents = (events || [])
        .filter((event) => event && SUMMARY_EVENT_TYPES.has(event.type))
        .filter((event) => {
            const text = normalizeEventText(event);
            const key = [event.type, event.botId || '', text].join('|');
            if (PERIODIC_BATTLE_EVENT_TYPES.has(event.type)) {
                const eventTimeMs = getEventTimeMs(event);
                const sampleKey = event.botId || '房间';
                if (seen.has(key)) {
                    const lastSampleAt = lastBattleSampleAtByBot[sampleKey];
                    if (!Number.isFinite(eventTimeMs)
                        || (Number.isFinite(lastSampleAt) && eventTimeMs - lastSampleAt < PERIODIC_BATTLE_SAMPLE_INTERVAL_MS)) {
                        return false;
                    }
                    lastBattleSampleAtByBot[sampleKey] = eventTimeMs;
                    return true;
                }
                seen.add(key);
                if (Number.isFinite(eventTimeMs)) {
                    lastBattleSampleAtByBot[sampleKey] = eventTimeMs;
                }
                return true;
            }
            if (event.type === '局内聊天') {
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
            }
            return true;
        });

    return capTimelineEvents(timelineEvents)
        .map((event) => ({
            gameTime: getEventGameTime(event, battleStartedAt),
            place: getEventPlace(event),
            actor: event.botId || '房间',
            event: normalizeEventText(event)
        }));
}

function buildBotDataCoverage(events, bots) {
    const sourceEvents = events || [];
    const battleStart = sourceEvents.find((event) => event && event.type === '战斗开始' && !event.botId)
        || sourceEvents.find((event) => event && event.type === '战斗开始');
    if (!battleStart || !battleStart.time) {
        return [];
    }

    const battleStartedAt = new Date(battleStart.time).getTime();
    if (!Number.isFinite(battleStartedAt)) {
        return [];
    }

    const botIds = new Set();
    (bots || []).forEach((bot) => {
        if (bot && bot.botId) {
            botIds.add(bot.botId);
        }
    });
    sourceEvents.forEach((event) => {
        if (event && event.botId) {
            botIds.add(event.botId);
        }
    });
    if (!botIds.size) {
        return [];
    }

    const coverageByBot = {};
    Array.from(botIds).forEach((botId) => {
        coverageByBot[botId] = {
            botId,
            count: 0,
            minutes: new Set(),
            lastEvent: null,
            lastEventTimeMs: NaN
        };
    });

    sourceEvents.forEach((event) => {
        if (!event || !event.botId || !CONTINUOUS_BOT_DATA_EVENT_TYPES.has(event.type)) {
            return;
        }
        const eventTimeMs = getEventTimeMs(event);
        if (!Number.isFinite(eventTimeMs) || eventTimeMs < battleStartedAt) {
            return;
        }
        const coverage = coverageByBot[event.botId];
        if (!coverage) {
            return;
        }
        coverage.count += 1;
        coverage.minutes.add(pad(Math.floor((eventTimeMs - battleStartedAt) / 60000)));
        if (!Number.isFinite(coverage.lastEventTimeMs) || eventTimeMs >= coverage.lastEventTimeMs) {
            coverage.lastEvent = event;
            coverage.lastEventTimeMs = eventTimeMs;
        }
    });

    return Object.keys(coverageByBot).sort().map((botId) => {
        const coverage = coverageByBot[botId];
        const lastEvent = coverage.lastEvent;
        return {
            botId,
            count: coverage.count,
            minutes: Array.from(coverage.minutes).sort().join(', ') || '无',
            last: lastEvent
                ? getEventGameTime(lastEvent, battleStart.time) + ' ' + lastEvent.type + ' - ' + (lastEvent.message || lastEvent.type)
                : '无'
        };
    });
}

function inferServerUrl(events) {
    const created = (events || []).find((event) => event && event.type === '测试房间创建');
    return created && created.data && created.data.serverUrl ? created.data.serverUrl : '';
}

function generateSummaryMarkdown(result) {
    const safeResult = result || {};
    const bots = safeResult.bots || [];
    const failedBots = bots.filter((bot) => bot.state !== BOT_STATES.Finished);
    const successBots = bots.length - failedBots.length;
    const events = Array.isArray(safeResult.rawEvents) ? safeResult.rawEvents : [];
    const keyEvents = safeResult.keyEvents || buildKeyEvents(events);
    const botDataCoverage = buildBotDataCoverage(events, bots);
    const serverUrl = safeResult.serverUrl || inferServerUrl(events);
    const firstGameEvent = keyEvents.find((event) => event.gameTime && event.gameTime !== '准备阶段');
    const lastGameEvent = keyEvents.slice().reverse().find((event) => event.gameTime && event.gameTime !== '准备阶段');
    const lines = [];

    lines.push('# 自动对局测试总结');
    lines.push('');
    lines.push(safeResult.completedSettlement && failedBots.length === 0
        ? '测试通过：所有 Bot 成功完成对局结算'
        : '测试失败：存在 Bot 未完成对局结算');
    lines.push('');
    lines.push('- 房间：' + (safeResult.roomId || 'unknown'));
    lines.push('- 成功人数：' + successBots);
    lines.push('- 失败人数：' + failedBots.length);
    lines.push('- 是否完成结算：' + (safeResult.completedSettlement ? '是' : '否'));
    if (safeResult.sessionDir) {
        lines.push('- 日志目录：' + safeResult.sessionDir);
    }
    lines.push('');
    lines.push('## 游戏时间地点事件');
    lines.push('');
    lines.push('- 游戏时间：' + (firstGameEvent ? firstGameEvent.gameTime : '00:00') + ' -> ' + (lastGameEvent ? lastGameEvent.gameTime : '00:00'));
    lines.push('- 地点：' + (safeResult.roomId || 'unknown') + (serverUrl ? ' @ ' + serverUrl : ''));
    lines.push('- 事件：');
    if (keyEvents.length) {
        keyEvents.forEach((event) => {
            lines.push('  - ' + (event.gameTime || '准备阶段') + ' ' + (event.place || safeResult.roomId || 'unknown')
                + ' ' + (event.actor || '房间') + '：' + event.event);
        });
    } else {
        lines.push('  - 暂无关键事件');
    }
    lines.push('');

    if (botDataCoverage.length) {
        lines.push('## Bot 持续数据覆盖');
        lines.push('');
        botDataCoverage.forEach((coverage) => {
            lines.push('- ' + coverage.botId + '：战斗数据 ' + coverage.count
                + ' 条；覆盖分钟 ' + coverage.minutes + '；最后 ' + coverage.last);
        });
        lines.push('');
    }

    if (failedBots.length) {
        lines.push('## 失败明细');
        lines.push('');
        failedBots.forEach((bot) => {
            const failure = bot.failure || {};
            lines.push('### ' + bot.botId);
            lines.push('');
            lines.push('- 失败阶段：' + (failure.stage || bot.state || '未知'));
            lines.push('- 失败原因：' + (failure.reason || '未知异常'));
            lines.push('- 最后一条成功事件：' + formatLastSuccess(bot.lastSuccessEvent));
            lines.push('- 可能原因：' + (failure.possibleCause || failure.reason || '未知'));
            if (failure.stack) {
                lines.push('');
                lines.push('```text');
                lines.push(failure.stack);
                lines.push('```');
            }
            lines.push('');
        });
    }

    if (safeResult.roomNotes && safeResult.roomNotes.length) {
        lines.push('## 房间备注');
        lines.push('');
        safeResult.roomNotes.forEach((note) => {
            lines.push('- ' + note);
        });
        lines.push('');
    }

    return lines.join('\n');
}

function writeSummary(sessionDir, result) {
    const summaryPath = path.join(sessionDir, 'summary.md');
    const rawEvents = readJsonlEvents(sessionDir);
    fs.writeFileSync(summaryPath, generateSummaryMarkdown(Object.assign({}, result || {}, {
        sessionDir,
        rawEvents
    })));
    return summaryPath;
}

module.exports = {
    generateSummaryMarkdown,
    writeSummary
};
