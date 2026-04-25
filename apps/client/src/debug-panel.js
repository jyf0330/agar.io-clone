'use strict';

var MAX_LOGS = 8;
var MAX_RECENT_EVENTS = 3;
var STALE_MOVE_MS = 2500;
var RENDER_INTERVAL_MS = 250;
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
    state.logs.unshift({
        message: message,
        level: level || 'info',
        at: now || state.now || Date.now()
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
    formatDebugPanel: formatDebugPanel,
    formatDebugPanelCopyText: formatDebugPanelCopyText,
    createDebugPanel: createDebugPanel
};
