'use strict';

const fs = require('fs');
const path = require('path');

const IMPORTANT_TYPES = new Set([
    '测试房间创建',
    '准备完成',
    '战斗开始',
    '战斗技能',
    '请求结算',
    '结算完成',
    '异常',
    '超时',
    '战斗行为缺失'
]);

function pad(value) {
    return String(value).padStart(2, '0');
}

function formatLocalDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value || '');
    }
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
        + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}

function readTextIfExists(filePath) {
    if (!fs.existsSync(filePath)) {
        return '';
    }
    return fs.readFileSync(filePath, 'utf8');
}

function parseSummaryMarkdown(markdown) {
    const text = String(markdown || '');
    const roomMatch = text.match(/- 房间：(.+)/);
    const successMatch = text.match(/- 成功人数：(\d+)/);
    const failedMatch = text.match(/- 失败人数：(\d+)/);
    const completedMatch = text.match(/- 是否完成结算：(.+)/);
    return {
        status: text.indexOf('测试通过') > -1 ? '通过' : '失败',
        roomId: roomMatch ? roomMatch[1].trim() : 'unknown',
        successCount: successMatch ? Number(successMatch[1]) : null,
        failureCount: failedMatch ? Number(failedMatch[1]) : null,
        settlementCompleted: completedMatch ? completedMatch[1].trim() : '未知'
    };
}

function readJsonl(filePath) {
    const text = readTextIfExists(filePath);
    if (!text.trim()) {
        return [];
    }
    return text.split(/\n+/)
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

function normalizeTimelineMessage(event) {
    const safeEvent = event || {};
    if (safeEvent.type === '测试房间创建') {
        const count = safeEvent.data && safeEvent.data.botCount ? safeEvent.data.botCount : '';
        return count ? '创建测试房间，Bot 数=' + count : '创建测试房间';
    }
    if (safeEvent.type === '准备完成') {
        return '所有 Bot 已进入等待阶段';
    }
    if (safeEvent.type === '战斗开始') {
        return '战斗开始';
    }
    if (safeEvent.type === '请求结算') {
        return '请求结算';
    }
    if (safeEvent.type === '结算完成') {
        return '结算完成';
    }
    if (safeEvent.type === '异常' || safeEvent.type === '超时' || safeEvent.level === 'error') {
        return (safeEvent.type || '异常') + '：' + (safeEvent.message || '未知');
    }
    return safeEvent.message || safeEvent.type || '事件';
}

function shouldKeepEvent(event) {
    if (!event) {
        return false;
    }
    if (IMPORTANT_TYPES.has(event.type)) {
        return true;
    }
    return event.level === 'error';
}

function collapseEvents(events) {
    const grouped = new Map();
    const seenBotActions = new Set();
    events.filter(shouldKeepEvent).forEach((event) => {
        const time = formatLocalDateTime(event.time);
        const message = normalizeTimelineMessage(event);
        if (event.botId && event.type === '战斗技能') {
            const actionKey = [event.botId, message].join('|');
            if (seenBotActions.has(actionKey)) {
                return;
            }
            seenBotActions.add(actionKey);
        }
        const key = [time, event.type || '', message, event.roomId || ''].join('|');
        if (!grouped.has(key)) {
            grouped.set(key, {
                time,
                type: event.type || '',
                message,
                roomId: event.roomId || '',
                bots: []
            });
        }
        const item = grouped.get(key);
        if (event.botId && item.bots.indexOf(event.botId) === -1) {
            item.bots.push(event.botId);
        }
    });
    return Array.from(grouped.values()).sort((left, right) => left.time.localeCompare(right.time));
}

function listSessionDirs(logDir, sessionName, limit) {
    const root = path.resolve(logDir || path.join(process.cwd(), 'logs/bot-test'));
    if (!fs.existsSync(root)) {
        return [];
    }
    if (sessionName) {
        const sessionPath = path.isAbsolute(sessionName) ? sessionName : path.join(root, sessionName);
        return fs.existsSync(sessionPath) ? [sessionPath] : [];
    }
    return fs.readdirSync(root)
        .map((entry) => path.join(root, entry))
        .filter((entryPath) => fs.statSync(entryPath).isDirectory())
        .sort((left, right) => path.basename(right).localeCompare(path.basename(left)))
        .slice(0, limit || 10);
}

function summarizeSession(sessionDir) {
    const summary = parseSummaryMarkdown(readTextIfExists(path.join(sessionDir, 'summary.md')));
    const events = readJsonl(path.join(sessionDir, 'raw_events.jsonl'));
    return {
        sessionName: path.basename(sessionDir),
        sessionDir,
        summary,
        timeline: collapseEvents(events)
    };
}

function buildBotLogSummary(options) {
    const settings = options || {};
    return {
        generatedAt: formatLocalDateTime(settings.now || new Date()),
        sessions: listSessionDirs(settings.logDir, settings.session, settings.limit)
            .map(summarizeSession)
    };
}

function formatTimelineItem(item) {
    const actor = item.bots && item.bots.length ? item.bots.sort().join(', ') : '房间';
    return '- ' + item.time + ' ' + actor + '：' + item.message;
}

function formatBotLogSummaryMarkdown(summary) {
    const safeSummary = summary || {};
    const lines = ['# Bot 测试简明时间线', ''];
    lines.push('生成时间：' + (safeSummary.generatedAt || formatLocalDateTime(new Date())));
    lines.push('');

    (safeSummary.sessions || []).forEach((session) => {
        const info = session.summary || {};
        lines.push('## ' + session.sessionName);
        lines.push('');
        lines.push('- 房间：' + (info.roomId || 'unknown'));
        lines.push('- 结果：' + (info.status || '未知') + '，成功 ' + (info.successCount === null ? '?' : info.successCount)
            + '，失败 ' + (info.failureCount === null ? '?' : info.failureCount)
            + '，结算：' + (info.settlementCompleted || '未知'));
        lines.push('- 目录：' + session.sessionDir);
        lines.push('');
        lines.push('### 时间线');
        lines.push('');
        if (!session.timeline || !session.timeline.length) {
            lines.push('- 无关键事件');
        } else {
            session.timeline.forEach((item) => {
                lines.push(formatTimelineItem(item));
            });
        }
        lines.push('');
    });

    return lines.join('\n');
}

module.exports = {
    buildBotLogSummary,
    formatBotLogSummaryMarkdown,
    parseSummaryMarkdown,
    collapseEvents,
    formatLocalDateTime
};
