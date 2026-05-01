'use strict';

const fs = require('fs');
const path = require('path');

function pad(value) {
    return String(value).padStart(2, '0');
}

function formatSessionName(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
        + '_' + pad(date.getHours()) + '-' + pad(date.getMinutes()) + '-' + pad(date.getSeconds());
}

function formatTime(date) {
    return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
}

function normalizeBotFileName(botId) {
    const match = String(botId || '').match(/(\d+)$/);
    if (match) {
        return 'bot_' + pad(match[1]) + '.md';
    }
    return String(botId || 'bot').toLowerCase().replace(/[^a-z0-9]+/g, '_') + '.md';
}

function stringifyData(data) {
    if (!data || !Object.keys(data).length) {
        return '';
    }
    return '，数据=' + JSON.stringify(data);
}

class BotTestLogger {
    constructor(options) {
        const settings = options || {};
        this.clock = settings.clock || (() => new Date());
        this.rootDir = settings.rootDir || path.resolve(process.cwd(), 'logs/bot-test');
        this.roomId = settings.roomId || 'test-room-001';
        this.sessionName = settings.sessionName || formatSessionName(this.clock());
        this.sessionDir = path.join(this.rootDir, this.sessionName);
        this.rawPath = path.join(this.sessionDir, 'raw_events.jsonl');
        this.errorsPath = path.join(this.sessionDir, 'errors.md');
        this.events = [];

        fs.mkdirSync(this.sessionDir, {recursive: true});
        fs.writeFileSync(this.rawPath, '');
        fs.writeFileSync(this.errorsPath, '# 错误日志\n\n');
    }

    append(fileName, line) {
        fs.appendFileSync(path.join(this.sessionDir, fileName), line + '\n');
    }

    raw(event) {
        const date = this.clock();
        const rawEvent = Object.assign({
            time: date.toISOString(),
            level: event.level || 'info',
            type: event.type || '',
            botId: event.botId || '',
            roomId: event.roomId || this.roomId,
            state: event.state || '',
            message: event.message || '',
            data: event.data || {}
        }, event || {});
        this.events.push(rawEvent);
        fs.appendFileSync(this.rawPath, JSON.stringify(rawEvent) + '\n');
        return rawEvent;
    }

    bot(event) {
        const date = this.clock();
        const botId = event.botId || 'Bot_00';
        const line = '[' + formatTime(date) + '][' + botId + '][' + (event.type || '事件') + '] '
            + (event.message || '') + stringifyData(event.data);
        this.append(normalizeBotFileName(botId), line);
        const rawEvent = this.raw(Object.assign({}, event, {
            level: event.level || 'info',
            roomId: event.roomId || this.roomId
        }));
        if ((event.level || '') === 'error') {
            this.append('errors.md', line);
        }
        return rawEvent;
    }

    room(event) {
        const date = this.clock();
        const roomId = event.roomId || this.roomId;
        const line = '[' + formatTime(date) + '][房间 ' + roomId + '][' + (event.type || '事件') + '] '
            + (event.message || '') + stringifyData(event.data);
        this.append('room_' + roomId + '.md', line);
        return this.raw(Object.assign({}, event, {
            botId: event.botId || '',
            roomId,
            state: event.state || 'Room',
            level: event.level || 'info'
        }));
    }

    error(event) {
        const date = this.clock();
        const actor = event.botId ? event.botId : ('房间 ' + (event.roomId || this.roomId));
        const line = '[' + formatTime(date) + '][' + actor + '][' + (event.type || '异常') + '] '
            + (event.message || '') + stringifyData(event.data);
        this.append('errors.md', line);
        return this.raw(Object.assign({}, event, {
            level: 'error',
            roomId: event.roomId || this.roomId
        }));
    }
}

module.exports = {
    BotTestLogger,
    formatSessionName,
    formatTime,
    normalizeBotFileName
};
