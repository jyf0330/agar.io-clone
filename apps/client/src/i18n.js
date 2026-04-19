'use strict';

var STORAGE_KEY = 'agar.locale';
var locale = 'zh-CN';

var translations = {
    'zh-CN': {
        appTitle: '开放吞噬',
        'startMenu.title': '开放吞噬',
        'startMenu.namePlaceholder': '请输入你的名字',
        'startMenu.invalidName': '昵称只能包含字母、数字或下划线',
        'startMenu.play': '开始游戏',
        'startMenu.spectate': '观战',
        'startMenu.drawCard': '绘制名片',
        'startMenu.settings': '设置',
        'startMenu.gameplay': '玩法说明',
        'startMenu.instructions.move': '用鼠标在屏幕上移动角色。',
        'startMenu.instructions.eat': '吃食物和其他玩家来成长（吃掉食物后会刷新新的食物）。',
        'startMenu.instructions.mass': '角色质量由吃下的食物数量决定。',
        'startMenu.instructions.goal': '目标：尽可能长大并吞噬其他玩家。',
        'settings.showBorder': '显示边界',
        'settings.showMass': '显示质量',
        'settings.continuity': '鼠标离开屏幕后继续移动',
        'settings.roundFood': '圆形食物',
        'settings.darkMode': '切换深色模式',
        'hud.leaderboard': '排行榜',
        'hud.unnamedCell': '未命名单元',
        'hud.materialization': '实体化',
        'hud.materializationValue': '实体化值：%{value}',
        'hud.materializationStage': '阶段：%{stage}',
        'hud.connection': '连接',
        'hud.connectionStatus': '状态：%{status}',
        'hud.connectionTarget': '目标：%{target}',
        'hud.resonance': '共鸣',
        'hud.intimacy': '亲密值：%{value}',
        'hud.spike': '尖刺值：%{value}',
        'hud.pollution': '污染值：%{value}',
        'hud.body': '身体',
        'hud.bodyParts': '部位数：%{count}',
        'hud.playerCard': '玩家名片',
        'hud.myCard': '我的名片',
        'hud.targetCard': '目标名片',
        'hud.noCardYet': '还没有名片',
        'parts.HEAD': '头',
        'parts.HAND': '手',
        'parts.FOOT': '脚',
        'parts.MOUTH': '嘴',
        'parts.HEART': '心',
        'parts.SPIKE': '尖刺',
        'draft.timeLeft': '剩余时间：%{seconds}秒',
        'draft.missing': '缺失：%{part}',
        'draft.fillHint': '请在倒计时结束前补上 %{part}',
        'draft.reroll': '重抽（%{count}）',
        'draft.skip': '跳过',
        'draft.confirm': '确认并开始',
        'draft.cancel': '取消',
        'draft.historyPick': '历史草稿',
        'editor.loading': '正在加载绘图工具...',
        'editor.failed': '加载绘图工具失败。',
        'editor.saved': '名片已保存。',
        'editor.exportPng': '已导出 PNG。',
        'editor.exportJson': '已导出 JSON。',
        'editor.scale': '缩放：%{value}x',
        'editor.select': '选择',
        'editor.brush': '画笔',
        'editor.rect': '矩形',
        'editor.circle': '圆形',
        'editor.line': '直线',
        'editor.text': '文字',
        'editor.eraser': '橡皮',
        'editor.undo': '撤销',
        'editor.redo': '重做',
        'editor.clear': '清空',
        'editor.save': '保存',
        'editor.exportPngButton': '导出 PNG',
        'editor.exportJsonButton': '导出 JSON',
        'editor.close': '关闭',
        'editor.stroke': '描边',
        'editor.fill': '填充',
        'editor.size': '粗细',
        'editor.zoomOut': '缩小',
        'editor.zoomIn': '放大',
        'editor.panelTitle': '绘制你的名片',
        'system.connected': '已连接到游戏！',
        'system.help': '输入 <b>-help</b> 查看命令列表。',
        'system.ping': '延迟：%{latency}ms',
        'system.playerEaten': '{GAME} - <b>%{name}</b> 被吃掉了',
        'system.playerDisconnected': '{GAME} - <b>%{name}</b> 已断开连接。',
        'system.playerJoined': '{GAME} - <b>%{name}</b> 加入了游戏。',
        'system.disconnected': '已断开连接！',
        'system.youDied': '你死了！',
        'system.kickedReason': '你被踢出了游戏，原因：%{reason}',
        'system.kicked': '你被踢出了游戏！',
        'language.toggle': 'English'
    },
    'en': {
        appTitle: 'Open Agar',
        'startMenu.title': 'Open Agar',
        'startMenu.namePlaceholder': 'Enter your name here',
        'startMenu.invalidName': 'Nick must be alphanumeric characters only!',
        'startMenu.play': 'Play',
        'startMenu.spectate': 'Spectate',
        'startMenu.drawCard': 'Draw Card',
        'startMenu.settings': 'Settings',
        'startMenu.gameplay': 'Gameplay',
        'startMenu.instructions.move': 'Move your mouse on the screen to move your character.',
        'startMenu.instructions.eat': 'Eat food and other players in order to grow your character (food respawns every time a player eats it).',
        'startMenu.instructions.mass': 'A player\'s mass is the number of food particles eaten.',
        'startMenu.instructions.goal': 'Objective: Try to get fat and eat other players.',
        'settings.showBorder': 'Show border',
        'settings.showMass': 'Show mass',
        'settings.continuity': 'Continue moving when mouse is off-screen',
        'settings.roundFood': 'Rounded food',
        'settings.darkMode': 'Toggle Dark Mode',
        'hud.leaderboard': 'Leaderboard',
        'hud.unnamedCell': 'An unnamed cell',
        'hud.materialization': 'Materialization',
        'hud.materializationValue': 'Materialization: %{value}',
        'hud.materializationStage': 'Stage: %{stage}',
        'hud.connection': 'Connection',
        'hud.connectionStatus': 'Status: %{status}',
        'hud.connectionTarget': 'Target: %{target}',
        'hud.resonance': 'Resonance',
        'hud.intimacy': 'Intimacy: %{value}',
        'hud.spike': 'Spike: %{value}',
        'hud.pollution': 'Pollution: %{value}',
        'hud.body': 'Body',
        'hud.bodyParts': 'Parts: %{count}',
        'hud.playerCard': 'Player Card',
        'hud.myCard': 'My Card',
        'hud.targetCard': 'Target Card',
        'hud.noCardYet': 'No card yet',
        'parts.HEAD': 'Head',
        'parts.HAND': 'Hand',
        'parts.FOOT': 'Foot',
        'parts.MOUTH': 'Mouth',
        'parts.HEART': 'Heart',
        'parts.SPIKE': 'Spike',
        'draft.timeLeft': 'Time left: %{seconds}s',
        'draft.missing': 'Missing: %{part}',
        'draft.fillHint': 'Fill the missing %{part} before the timer ends.',
        'draft.reroll': 'Reroll (%{count})',
        'draft.skip': 'Skip',
        'draft.confirm': 'Confirm & Play',
        'draft.cancel': 'Cancel',
        'draft.historyPick': 'History pick',
        'editor.loading': 'Loading drawing tools...',
        'editor.failed': 'Failed to load drawing tools.',
        'editor.saved': 'Card saved.',
        'editor.exportPng': 'PNG exported.',
        'editor.exportJson': 'JSON exported.',
        'editor.scale': 'Scale: %{value}x',
        'editor.select': 'Select',
        'editor.brush': 'Brush',
        'editor.rect': 'Rect',
        'editor.circle': 'Circle',
        'editor.line': 'Line',
        'editor.text': 'Text',
        'editor.eraser': 'Eraser',
        'editor.undo': 'Undo',
        'editor.redo': 'Redo',
        'editor.clear': 'Clear',
        'editor.save': 'Save',
        'editor.exportPngButton': 'Export PNG',
        'editor.exportJsonButton': 'Export JSON',
        'editor.close': 'Close',
        'editor.stroke': 'Stroke',
        'editor.fill': 'Fill',
        'editor.size': 'Size',
        'editor.zoomOut': 'Zoom Out',
        'editor.zoomIn': 'Zoom In',
        'editor.panelTitle': 'Draw Your Card',
        'system.connected': 'Connected to the game!',
        'system.help': 'Type <b>-help</b> for a list of commands.',
        'system.ping': 'Ping: %{latency}ms',
        'system.playerEaten': '{GAME} - <b>%{name}</b> was eaten',
        'system.playerDisconnected': '{GAME} - <b>%{name}</b> disconnected.',
        'system.playerJoined': '{GAME} - <b>%{name}</b> joined.',
        'system.disconnected': 'Disconnected!',
        'system.youDied': 'You died!',
        'system.kickedReason': 'You were kicked for: %{reason}',
        'system.kicked': 'You were kicked!',
        'language.toggle': '中文'
    }
};

function getStorage(storageOverride) {
    if (storageOverride) {
        return storageOverride;
    }

    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
    }

    if (typeof global !== 'undefined' && global.localStorage) {
        return global.localStorage;
    }

    return null;
}

function setLocale(nextLocale, storageOverride) {
    locale = translations[nextLocale] ? nextLocale : 'zh-CN';
    var storage = getStorage(storageOverride);
    if (storage) {
        storage.setItem(STORAGE_KEY, locale);
    }
    return locale;
}

function loadLocale(storageOverride) {
    var storage = getStorage(storageOverride);
    if (storage) {
        var storedLocale = storage.getItem(STORAGE_KEY);
        if (translations[storedLocale]) {
            locale = storedLocale;
        }
    }

    return locale;
}

function getLocale() {
    return locale;
}

function interpolate(template, params) {
    return template.replace(/%\{([^}]+)\}/g, function (_, key) {
        return params && Object.prototype.hasOwnProperty.call(params, key) ? params[key] : '';
    });
}

function t(key, params) {
    var dictionary = translations[locale] || translations['zh-CN'];
    var template = dictionary[key] || key;
    return interpolate(template, params || {});
}

module.exports = {
    loadLocale: loadLocale,
    setLocale: setLocale,
    getLocale: getLocale,
    t: t
};
