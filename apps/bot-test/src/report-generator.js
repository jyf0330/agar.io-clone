'use strict';

const fs = require('fs');
const path = require('path');

const {BOT_STATES} = require('./constants');

function formatLastSuccess(event) {
    if (!event) {
        return '无';
    }
    return (event.type || '事件') + ' - ' + (event.message || '');
}

function generateSummaryMarkdown(result) {
    const safeResult = result || {};
    const bots = safeResult.bots || [];
    const failedBots = bots.filter((bot) => bot.state !== BOT_STATES.Finished);
    const successBots = bots.length - failedBots.length;
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
    fs.writeFileSync(summaryPath, generateSummaryMarkdown(Object.assign({}, result || {}, {
        sessionDir
    })));
    return summaryPath;
}

module.exports = {
    generateSummaryMarkdown,
    writeSummary
};
