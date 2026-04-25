'use strict';

var MAX_LOGS = 8;
var MAX_RECENT_EVENTS = 3;
var MAX_RECENT_TIMINGS = 3;
var MAX_PROBE_LOGS = 6;
var STALE_MOVE_MS = 2500;
var RENDER_INTERVAL_MS = 250;
var DEVOUR_WINDOW_MS = 3000;
var RECENT_EVENT_IGNORES = {
    serverTellPlayerMove: true
};

function createDebugState(now) {
    return {
        startedAt: now || Date.now(),
        now: now || Date.now(),
        visible: true,
        logs: [],
        frame: {
            fps: 0,
            frameMs: 0,
            lastFrameAt: 0
        },
        socket: {
            connected: false,
            latencyMs: null,
            lastEventName: '无',
            lastEventAt: 0,
            lastMoveAt: 0,
            recentEvents: [],
            movePackets: 0,
            metaPackets: 0
        },
        game: {
            started: false,
            playerType: '未进入'
        },
        player: {
            id: '',
            name: '',
            x: 0,
            y: 0,
            cells: 0,
            mass: 0
        },
        world: {
            players: 0,
            cells: 0,
            foods: 0,
            fireFood: 0,
            viruses: 0,
            partLoot: 0,
            ghosts: 0
        },
        modules: {
            npc: false,
            chat: false,
            body: false,
            pet: false,
            ghostDebug: false,
            materialization: false,
            connection: false,
            playerCard: false
        },
        perf: {
            devourLabel: '',
            devourStartedAt: 0,
            devourActiveUntil: 0,
            devourLogCount: 0,
            movementPacketsInWindow: 0,
            metaPacketsInWindow: 0,
            lastMovementPayload: null,
            lastMetaPayload: null,
            recentTimings: [],
            eventGaps: [],
            longTasks: []
        }
    };
}

function mergeObject(target, patch) {
    Object.keys(patch || {}).forEach(function (key) {
        if (patch[key] && typeof patch[key] === 'object' && !Array.isArray(patch[key])) {
            target[key] = target[key] || {};
            mergeObject(target[key], patch[key]);
        } else {
            target[key] = patch[key];
        }
    });
}

function updateState(state, patch) {
    mergeObject(state, patch || {});
    if (!state.now) {
        state.now = Date.now();
    }
    return state;
}

function recordLog(state, message, level, now) {
    var timestamp = now || state.now || Date.now();
    if (state.perf && state.perf.devourActiveUntil && timestamp <= state.perf.devourActiveUntil) {
        state.perf.devourLogCount += 1;
    }
    state.logs.unshift({
        message: message,
        level: level || 'info',
        at: timestamp
    });
    if (state.logs.length > MAX_LOGS) {
        state.logs.length = MAX_LOGS;
    }
    return state;
}

function markSocketEvent(state, eventName, now) {
    state.socket.lastEventName = eventName;
    state.socket.lastEventAt = now || state.now || Date.now();
    state.socket.recentEvents = state.socket.recentEvents || [];
    if (!RECENT_EVENT_IGNORES[eventName]) {
        state.socket.recentEvents.unshift({
            name: eventName,
            at: state.socket.lastEventAt
        });
        if (state.socket.recentEvents.length > MAX_RECENT_EVENTS) {
            state.socket.recentEvents.length = MAX_RECENT_EVENTS;
        }
    }
    if (eventName === 'serverTellPlayerMove') {
        state.socket.movePackets += 1;
        state.socket.lastMoveAt = state.socket.lastEventAt;
    }
    if (eventName === 'playerMetaUpdate') {
        state.socket.metaPackets += 1;
    }
    return state;
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatAge(now, then) {
    if (!then) {
        return '无';
    }
    var seconds = Math.max(0, (now - then) / 1000);
    return seconds.toFixed(seconds >= 10 ? 0 : 1) + 's 前';
}

function formatModule(name, enabled) {
    return '<span class="debug-panel-module ' + (enabled ? 'is-ok' : 'is-missing') + '">'
        + name + '：' + (enabled ? '有输出' : '未输出') + '</span>';
}

function getRecentEvents(state) {
    var events = state.socket.recentEvents || [];
    if (events.length) {
        return events;
    }
    if (state.socket.lastEventName && state.socket.lastEventName !== '无' && !RECENT_EVENT_IGNORES[state.socket.lastEventName]) {
        return [{
            name: state.socket.lastEventName,
            at: state.socket.lastEventAt
        }];
    }
    return [];
}

function formatRecentEventsHtml(state, now) {
    var events = getRecentEvents(state);
    if (!events.length) {
        return '无';
    }
    return events.map(function (event) {
        return escapeHtml(event.name) + '（' + formatAge(now, event.at) + '）';
    }).join(' / ');
}

function formatRecentEventsText(state, now) {
    var events = getRecentEvents(state);
    if (!events.length) {
        return '无';
    }
    return events.map(function (event) {
        return event.name + '（' + formatAge(now, event.at) + '）';
    }).join(' / ');
}

function trimRecent(list, max) {
    if (list.length > max) {
        list.length = max;
    }
}

function recordProbeLog(state, message, level, now) {
    var timestamp = now || state.now || Date.now();
    var probeLogCount = state.perf ? state.perf.devourLogCount : 0;
    if (!state.perf || probeLogCount < MAX_PROBE_LOGS || level === 'warn') {
        recordLog(state, message, level || 'info', timestamp);
    } else {
        state.perf.devourLogCount += 1;
    }
}

function isDevourWindowActive(state, now) {
    return !!(state.perf && state.perf.devourActiveUntil && now <= state.perf.devourActiveUntil);
}

function startDevourProbe(state, label, now) {
    var timestamp = now || state.now || Date.now();
    state.perf.devourLabel = label || '未知玩家';
    state.perf.devourStartedAt = timestamp;
    state.perf.devourActiveUntil = timestamp + DEVOUR_WINDOW_MS;
    state.perf.devourLogCount = 0;
    state.perf.movementPacketsInWindow = 0;
    state.perf.metaPacketsInWindow = 0;
    state.perf.lastMovementPayload = null;
    state.perf.lastMetaPayload = null;
    state.perf.recentTimings = [];
    state.perf.eventGaps = [];
    state.perf.longTasks = [];
    recordLog(state, '吞噬探针开启：' + state.perf.devourLabel + ' 被吃掉，观察 3 秒窗口。', 'warn', timestamp);
    return state;
}

function recordMovementPayload(state, payload, handlerMs, now) {
    var timestamp = now || state.now || Date.now();
    var snapshot = {
        players: payload.players || 0,
        cells: payload.cells || 0,
        foods: payload.foods || 0,
        fireFood: payload.fireFood || 0,
        viruses: payload.viruses || 0,
        partLoot: payload.partLoot || 0,
        ghosts: payload.ghosts || 0,
        handlerMs: Math.round(handlerMs || 0),
        at: timestamp
    };
    state.perf.lastMovementPayload = snapshot;
    if (isDevourWindowActive(state, timestamp)) {
        state.perf.movementPacketsInWindow += 1;
        recordProbeLog(state, '吞噬窗口同步包：玩家 ' + snapshot.players
            + ' / 细胞 ' + snapshot.cells
            + ' / 食物 ' + snapshot.foods
            + ' / 部位 ' + snapshot.partLoot
            + ' / handler ' + snapshot.handlerMs + 'ms。', snapshot.handlerMs >= 16 ? 'warn' : 'info', timestamp);
    }
    return state;
}

function recordMetaPayload(state, payload, handlerMs, now) {
    var timestamp = now || state.now || Date.now();
    var snapshot = {
        items: payload.items || 0,
        bodyParts: payload.bodyParts || 0,
        handlerMs: Math.round(handlerMs || 0),
        at: timestamp
    };
    state.perf.lastMetaPayload = snapshot;
    if (isDevourWindowActive(state, timestamp)) {
        state.perf.metaPacketsInWindow += 1;
        recordProbeLog(state, '吞噬窗口元数据：条目 ' + snapshot.items
            + ' / 部位 ' + snapshot.bodyParts
            + ' / handler ' + snapshot.handlerMs + 'ms。', snapshot.handlerMs >= 16 ? 'warn' : 'info', timestamp);
    }
    return state;
}

function recordHandlerTiming(state, eventName, handlerMs, now) {
    var timestamp = now || state.now || Date.now();
    var timing = {
        eventName: eventName,
        handlerMs: Math.round(handlerMs || 0),
        at: timestamp
    };
    state.perf.recentTimings.unshift(timing);
    trimRecent(state.perf.recentTimings, MAX_RECENT_TIMINGS);
    if (isDevourWindowActive(state, timestamp) && timing.handlerMs >= 16) {
        recordProbeLog(state, '吞噬窗口事件处理偏慢：' + eventName + ' ' + timing.handlerMs + 'ms。', timing.handlerMs >= 50 ? 'warn' : 'info', timestamp);
    }
    return state;
}

function recordDevourMilestone(state, eventName, now) {
    var timestamp = now || state.now || Date.now();
    if (!state.perf.devourStartedAt) {
        return state;
    }
    var gap = {
        eventName: eventName,
        ms: timestamp - state.perf.devourStartedAt,
        at: timestamp
    };
    state.perf.eventGaps.unshift(gap);
    trimRecent(state.perf.eventGaps, MAX_RECENT_TIMINGS);
    recordProbeLog(state, '吞噬链路：playerDied → ' + eventName + ' ' + gap.ms + 'ms。', gap.ms >= 500 ? 'warn' : 'info', timestamp);
    return state;
}

function recordLongTask(state, durationMs, now) {
    var timestamp = now || state.now || Date.now();
    var task = {
        durationMs: Math.round(durationMs || 0),
        at: timestamp
    };
    state.perf.longTasks.unshift(task);
    trimRecent(state.perf.longTasks, MAX_RECENT_TIMINGS);
    if (isDevourWindowActive(state, timestamp) || task.durationMs >= 50) {
        recordProbeLog(state, '主线程 long task ' + task.durationMs + 'ms。', task.durationMs >= 80 ? 'warn' : 'info', timestamp);
    }
    return state;
}

function formatMovementPayload(payload) {
    if (!payload) {
        return '暂无';
    }
    return '玩家 ' + payload.players
        + ' / 细胞 ' + payload.cells
        + ' / 食物 ' + payload.foods
        + ' / 喷射 ' + payload.fireFood
        + ' / 病毒 ' + payload.viruses
        + ' / 部位 ' + payload.partLoot
        + ' / 回响 ' + payload.ghosts
        + ' / handler ' + payload.handlerMs + 'ms';
}

function formatMetaPayload(payload) {
    if (!payload) {
        return '暂无';
    }
    return '条目 ' + payload.items + ' / 部位 ' + payload.bodyParts + ' / handler ' + payload.handlerMs + 'ms';
}

function formatLatestTiming(state) {
    var timing = state.perf.recentTimings[0];
    if (!timing) {
        return '暂无';
    }
    return timing.eventName + ' ' + timing.handlerMs + 'ms';
}

function formatLatestGap(state) {
    var gap = state.perf.eventGaps[0];
    if (!gap) {
        return '暂无';
    }
    return 'playerDied → ' + gap.eventName + ' ' + gap.ms + 'ms';
}

function formatLatestLongTask(state) {
    var task = state.perf.longTasks[0];
    if (!task) {
        return '暂无';
    }
    return 'long task ' + task.durationMs + 'ms';
}

function formatPerfProbeHtml(state, now) {
    var perf = state.perf;
    if (!perf || (!perf.devourStartedAt && !perf.lastMovementPayload && !perf.lastMetaPayload && !perf.recentTimings.length && !perf.longTasks.length)) {
        return '';
    }
    var remainingMs = Math.max(0, (perf.devourActiveUntil || 0) - now);
    var status = remainingMs > 0 ? '观察中 ' + (remainingMs / 1000).toFixed(1) + 's' : '窗口结束';
    return [
        '<div class="debug-panel-log-title">吞噬探针</div>',
        '<div class="debug-panel-line">目标：' + escapeHtml(perf.devourLabel || '暂无')
            + ' · ' + status
            + ' · 同步包 ' + perf.movementPacketsInWindow
            + ' · Meta ' + perf.metaPacketsInWindow
            + ' · 日志 ' + perf.devourLogCount
            + '</div>',
        '<div class="debug-panel-line">最近同步：' + escapeHtml(formatMovementPayload(perf.lastMovementPayload)) + '</div>',
        '<div class="debug-panel-line">最近元数据：' + escapeHtml(formatMetaPayload(perf.lastMetaPayload)) + '</div>',
        '<div class="debug-panel-line">最近慢事件：' + escapeHtml(formatLatestTiming(state)) + '</div>',
        '<div class="debug-panel-line">链路间隔：' + escapeHtml(formatLatestGap(state)) + '</div>',
        '<div class="debug-panel-line">主线程：' + escapeHtml(formatLatestLongTask(state)) + '</div>'
    ].join('');
}

function formatDebugPanel(state) {
    var now = state.now || Date.now();
    var runtimeLabel = state.game.started ? '游戏中' : '未开始';
    var socketLabel = state.socket.connected ? '已连接' : '未连接';
    var warnings = [];
    var moveAge = state.socket.lastMoveAt ? now - state.socket.lastMoveAt : null;

    if (state.game.started && moveAge !== null && moveAge > STALE_MOVE_MS) {
        warnings.push('可能卡住：移动同步 ' + (moveAge / 1000).toFixed(1) + 's 没有更新');
    }
    if (state.frame.fps > 0 && (state.frame.fps < 24 || state.frame.frameMs > 45)) {
        warnings.push('渲染偏慢：' + state.frame.fps + ' FPS / ' + state.frame.frameMs + 'ms');
    }

    return [
        '<div class="debug-panel-header">',
        '<div class="debug-panel-title">调试面板</div>',
        '<button id="debugPanelCopyButton" class="debug-panel-copy" type="button">复制</button>',
        '</div>',
        '<div class="debug-panel-line">运行状态：' + runtimeLabel + ' / ' + escapeHtml(state.game.playerType || '未知') + '</div>',
        '<div class="debug-panel-line">帧率：' + (state.frame.fps || 0) + ' FPS / ' + (state.frame.frameMs || 0) + 'ms</div>',
        '<div class="debug-panel-line">Socket：' + socketLabel
            + ' · 延迟：' + (typeof state.socket.latencyMs === 'number' ? state.socket.latencyMs + 'ms' : '未知')
            + '</div>',
        '<div class="debug-panel-line">最近事件：' + formatRecentEventsHtml(state, now)
            + ' · 移动包 ' + state.socket.movePackets
            + ' · 元数据 ' + state.socket.metaPackets
            + '</div>',
        '<div class="debug-panel-line">'
            + '玩家 ' + state.world.players
            + ' / 细胞 ' + state.world.cells
            + ' / 食物 ' + state.world.foods
            + ' / 喷射 ' + state.world.fireFood
            + ' / 病毒 ' + state.world.viruses
            + ' / 部位 ' + state.world.partLoot
            + ' / 回响 ' + state.world.ghosts
            + '</div>',
        '<div class="debug-panel-line">本机玩家：' + escapeHtml(state.player.name || state.player.id || '未知')
            + ' · 质量 ' + Math.round(state.player.mass || 0)
            + ' · 坐标 ' + Math.round(state.player.x || 0) + ',' + Math.round(state.player.y || 0)
            + '</div>',
        warnings.length ? '<div class="debug-panel-warnings">' + warnings.map(escapeHtml).join('<br />') + '</div>' : '',
        '<div class="debug-panel-modules">'
            + formatModule('NPC', state.modules.npc)
            + formatModule('聊天', state.modules.chat)
            + formatModule('身体', state.modules.body)
            + formatModule('跟宠', state.modules.pet)
            + formatModule('历史回响', state.modules.ghostDebug)
            + formatModule('实体化', state.modules.materialization)
            + formatModule('连接', state.modules.connection)
            + formatModule('名片', state.modules.playerCard)
            + '</div>',
        formatPerfProbeHtml(state, now),
        '<div class="debug-panel-log-title">中文事件日志</div>',
        '<ol class="debug-panel-log">'
            + (state.logs.length ? state.logs.map(function (entry) {
                return '<li class="is-' + escapeHtml(entry.level) + '">' + escapeHtml(entry.message) + '</li>';
            }).join('') : '<li>暂无调试事件</li>')
            + '</ol>'
    ].join('');
}

function formatDebugPanelCopyText(state) {
    var now = state.now || Date.now();
    var runtimeLabel = state.game.started ? '游戏中' : '未开始';
    var socketLabel = state.socket.connected ? '已连接' : '未连接';
    var lines = [
        '调试面板',
        '运行状态：' + runtimeLabel + ' / ' + (state.game.playerType || '未知'),
        '帧率：' + (state.frame.fps || 0) + ' FPS / ' + (state.frame.frameMs || 0) + 'ms',
        'Socket：' + socketLabel + ' · 延迟：' + (typeof state.socket.latencyMs === 'number' ? state.socket.latencyMs + 'ms' : '未知'),
        '最近事件：' + formatRecentEventsText(state, now) + ' · 移动包 ' + state.socket.movePackets + ' · 元数据 ' + state.socket.metaPackets,
        '实体：玩家 ' + state.world.players
            + ' / 细胞 ' + state.world.cells
            + ' / 食物 ' + state.world.foods
            + ' / 喷射 ' + state.world.fireFood
            + ' / 病毒 ' + state.world.viruses
            + ' / 部位 ' + state.world.partLoot
            + ' / 回响 ' + state.world.ghosts,
        '本机玩家：' + (state.player.name || state.player.id || '未知')
            + ' · 质量 ' + Math.round(state.player.mass || 0)
            + ' · 坐标 ' + Math.round(state.player.x || 0) + ',' + Math.round(state.player.y || 0),
        '模块：NPC ' + (state.modules.npc ? '有输出' : '未输出')
            + ' / 聊天 ' + (state.modules.chat ? '有输出' : '未输出')
            + ' / 身体 ' + (state.modules.body ? '有输出' : '未输出')
            + ' / 跟宠 ' + (state.modules.pet ? '有输出' : '未输出')
            + ' / 历史回响 ' + (state.modules.ghostDebug ? '有输出' : '未输出')
            + ' / 实体化 ' + (state.modules.materialization ? '有输出' : '未输出')
            + ' / 连接 ' + (state.modules.connection ? '有输出' : '未输出')
            + ' / 名片 ' + (state.modules.playerCard ? '有输出' : '未输出')
    ];

    if (state.perf && (state.perf.devourStartedAt || state.perf.lastMovementPayload || state.perf.lastMetaPayload)) {
        lines.push('吞噬探针：' + (state.perf.devourLabel || '暂无'));
        lines.push('吞噬包计数：同步包 ' + state.perf.movementPacketsInWindow + ' / Meta ' + state.perf.metaPacketsInWindow + ' / 日志 ' + state.perf.devourLogCount);
        lines.push('最近同步：' + formatMovementPayload(state.perf.lastMovementPayload));
        lines.push('最近元数据：' + formatMetaPayload(state.perf.lastMetaPayload));
        lines.push('最近慢事件：' + formatLatestTiming(state));
        lines.push('链路间隔：' + formatLatestGap(state));
        lines.push('主线程：' + formatLatestLongTask(state));
    }

    if (state.logs.length) {
        lines.push('中文事件日志：');
        state.logs.forEach(function (entry) {
            lines.push('- ' + entry.message);
        });
    } else {
        lines.push('中文事件日志：暂无调试事件');
    }

    return lines.join('\n');
}

function copyTextToClipboard(document, win, text) {
    win = win || document.defaultView;
    if (win && win.navigator && win.navigator.clipboard && win.navigator.clipboard.writeText) {
        return win.navigator.clipboard.writeText(text);
    }

    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
    } finally {
        document.body.removeChild(textarea);
    }
    return Promise.resolve();
}

function summarizeWorld(snapshot) {
    var users = snapshot.users || [];
    var cells = 0;
    users.forEach(function (user) {
        cells += Array.isArray(user.cells) ? user.cells.length : 0;
    });

    return {
        players: users.length,
        cells: cells,
        foods: (snapshot.foods || []).length,
        fireFood: (snapshot.fireFood || []).length,
        viruses: (snapshot.viruses || []).length,
        partLoot: (snapshot.partLoot || []).length,
        ghosts: (snapshot.ghosts || []).length
    };
}

function summarizePlayer(player) {
    var cells = player && Array.isArray(player.cells) ? player.cells : [];
    var mass = cells.reduce(function (total, cell) {
        return total + (cell.mass || 0);
    }, 0);

    return {
        id: player && player.id,
        name: player && player.name,
        x: player && player.x,
        y: player && player.y,
        cells: cells.length,
        mass: mass
    };
}

function summarizeModules(snapshot) {
    var player = snapshot.player || {};

    return {
        npc: snapshot.npcFeaturesEnabled !== false && Array.isArray(player.npcRelationships),
        chat: !!snapshot.chatReady,
        body: typeof player.bodyPartCount === 'number',
        pet: !!(player.activePet && player.activePet.active),
        ghostDebug: !!(player.ghostDebug && player.ghostDebug.enabled),
        materialization: typeof player.materialization === 'number',
        connection: !!player.connectionStatus,
        playerCard: !!player.playerCardPreviewDataUrl
    };
}

function createDebugPanel(options) {
    var document = options.document;
    var win = options.window;
    var root = document.getElementById('debugPanel');
    var toggle = document.getElementById('debugPanelToggle');
    var state = createDebugState(Date.now());
    var lastRenderAt = 0;
    var longTaskObserver = null;

    if (!root) {
        root = document.createElement('div');
        root.id = 'debugPanel';
        (document.getElementById('gameAreaWrapper') || document.body).appendChild(root);
    }
    if (!toggle) {
        toggle = document.createElement('button');
        toggle.id = 'debugPanelToggle';
        toggle.type = 'button';
        toggle.textContent = '调试';
        (document.getElementById('gameAreaWrapper') || document.body).appendChild(toggle);
    }

    function render(force) {
        var now = Date.now();
        if (!force && now - lastRenderAt < RENDER_INTERVAL_MS) {
            return;
        }
        lastRenderAt = now;
        state.now = now;
        root.innerHTML = formatDebugPanel(state);
        root.className = state.visible ? 'debug-panel' : 'debug-panel is-collapsed';
        toggle.className = state.visible ? 'debug-panel-toggle is-open' : 'debug-panel-toggle';
        bindCopyButton();
    }

    function bindCopyButton() {
        var copyButton = root.querySelector('#debugPanelCopyButton');
        if (!copyButton) {
            return;
        }
        copyButton.addEventListener('click', function () {
            copyTextToClipboard(document, win, formatDebugPanelCopyText(state))
                .then(function () {
                    recordLog(state, '调试面板内容已复制。', 'ok', Date.now());
                    render(true);
                })
                .catch(function () {
                    recordLog(state, '复制失败，请手动选择调试面板内容。', 'warn', Date.now());
                    render(true);
                });
        });
    }

    toggle.addEventListener('click', function () {
        state.visible = !state.visible;
        recordLog(state, state.visible ? '调试面板已展开' : '调试面板已收起', 'info', Date.now());
        render(true);
    });

    if (win && win.PerformanceObserver) {
        try {
            longTaskObserver = new win.PerformanceObserver(function (list) {
                list.getEntries().forEach(function (entry) {
                    recordLongTask(state, entry.duration, Date.now());
                });
                render(true);
            });
            longTaskObserver.observe({entryTypes: ['longtask']});
        } catch (error) {
            recordLog(state, '当前浏览器不支持 long task 探针。', 'warn', Date.now());
        }
    }

    render(true);

    return {
        state: state,
        render: render,
        log: function (message, level) {
            recordLog(state, message, level, Date.now());
            render(true);
        },
        markSocketEvent: function (eventName) {
            markSocketEvent(state, eventName, Date.now());
            render(false);
        },
        startDevourProbe: function (label) {
            startDevourProbe(state, label, Date.now());
            render(true);
        },
        recordMovementPayload: function (payload, handlerMs) {
            recordMovementPayload(state, payload || {}, handlerMs, Date.now());
            render(false);
        },
        recordMetaPayload: function (payload, handlerMs) {
            recordMetaPayload(state, payload || {}, handlerMs, Date.now());
            render(false);
        },
        recordHandlerTiming: function (eventName, handlerMs) {
            recordHandlerTiming(state, eventName, handlerMs, Date.now());
            render(false);
        },
        recordDevourMilestone: function (eventName) {
            recordDevourMilestone(state, eventName, Date.now());
            render(true);
        },
        recordLongTask: function (durationMs) {
            recordLongTask(state, durationMs, Date.now());
            render(true);
        },
        update: function (patch) {
            updateState(state, patch || {});
            render(false);
        },
        sampleFrame: function (snapshot) {
            var now = Date.now();
            var frameMs = state.frame.lastFrameAt ? now - state.frame.lastFrameAt : 0;
            state.frame.lastFrameAt = now;
            if (frameMs > 0) {
                state.frame.frameMs = Math.round(frameMs);
                state.frame.fps = Math.round(1000 / frameMs);
            }
            updateState(state, {
                now: now,
                socket: {
                    connected: !!(snapshot.socket && snapshot.socket.connected)
                },
                game: {
                    started: !!snapshot.gameStart,
                    playerType: snapshot.playerType || '未知'
                },
                player: summarizePlayer(snapshot.player),
                world: summarizeWorld(snapshot),
                modules: summarizeModules(snapshot)
            });
            render(false);
        },
        destroy: function () {
            if (longTaskObserver && typeof longTaskObserver.disconnect === 'function') {
                longTaskObserver.disconnect();
            }
            if (root && root.parentNode) {
                root.parentNode.removeChild(root);
            }
            if (toggle && toggle.parentNode) {
                toggle.parentNode.removeChild(toggle);
            }
        }
    };
}

module.exports = {
    createDebugState: createDebugState,
    updateState: updateState,
    recordLog: recordLog,
    markSocketEvent: markSocketEvent,
    startDevourProbe: startDevourProbe,
    recordMovementPayload: recordMovementPayload,
    recordMetaPayload: recordMetaPayload,
    recordHandlerTiming: recordHandlerTiming,
    recordDevourMilestone: recordDevourMilestone,
    recordLongTask: recordLongTask,
    formatDebugPanel: formatDebugPanel,
    formatDebugPanelCopyText: formatDebugPanelCopyText,
    createDebugPanel: createDebugPanel
};
