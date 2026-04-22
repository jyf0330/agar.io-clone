var io = require('socket.io-client');
var render = require('./render');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');
var formatMaterializationStatus = require('./materialization-status');
var formatConnectionStatus = require('./connection-status');
var formatRelationshipStatus = require('./relationship-status');
var formatBodyStatus = require('./body-status');
var playerCardStorage = require('./player-card-storage');
var playerCardDraftStore = require('./player-card-draft-store');
var formatPlayerCardPreview = require('./player-card-preview');
var createPlayerCardEditor = require('./player-card-editor');
var i18n = require('./i18n');
var avatarDraftConfig = require('./avatar-draft-config');
var avatarHistoryStore = require('./avatar-history-store');
var avatarDraftCandidates = require('./avatar-draft-candidates');
var avatarDraftPreview = require('./avatar-draft-preview');
var playerCardLayers = require('./player-card-layers');

var playerNameInput = document.getElementById('playerNameInput');
var socket;
var playerCardEditor;
var activeDraftSession = null;
var draftTimerHandle = null;

var debug = function (args) {
    if (console && console.log) {
        console.log(args);
    }
};

if (/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)) {
    global.mobile = true;
}

i18n.loadLocale();

function enterGame(type) {
    global.playerName = playerNameInput.value.replace(/(<([^>]+)>)/ig, '').substring(0, 25);
    global.playerType = type;
    global.playerCard = playerCardStorage.loadPlayerCard();
    global.targetPlayerCardPreviewDataUrl = null;

    global.screen.width = window.innerWidth;
    global.screen.height = window.innerHeight;

    document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document.getElementById('gameAreaWrapper').style.opacity = 1;
    if (!socket) {
        socket = io({ query: "type=" + type });
        setupSocket(socket);
    }
    if (!global.animLoopHandle)
        animloop();
    socket.emit('respawn');
    window.chat.socket = socket;
    window.chat.registerFunctions();
    window.canvas.socket = socket;
    global.socket = socket;
}

function startGame(type) {
    if (type === 'player' && avatarDraftConfig.enableAvatarDraftFeature) {
        beginAvatarDraftFlow(type);
        return;
    }

    enterGame(type);
}

// Checks if the nick chosen contains valid alphanumeric characters (and underscores).
function validNick() {
    var regex = /^\w*$/;
    debug('Regex Test', regex.exec(playerNameInput.value));
    return regex.exec(playerNameInput.value) !== null;
}

window.onload = function () {

    var btn = document.getElementById('startButton'),
        btnS = document.getElementById('spectateButton'),
        nickErrorText = document.querySelector('#startMenu .input-error'),
        paintCardButton = document.getElementById('paintCardButton'),
        languageToggleButton = document.getElementById('languageToggleButton');

    applyTranslations();
    renderPlayerCardPreviews();

    playerCardEditor = createPlayerCardEditor({
        panelEl: document.getElementById('playerCardPanel'),
        openButton: document.getElementById('paintCardButton'),
        closeButton: document.getElementById('closeCardPanelButton'),
        selectButton: document.getElementById('selectToolButton'),
        drawButton: document.getElementById('drawToolButton'),
        rectangleButton: document.getElementById('rectToolButton'),
        circleButton: document.getElementById('circleToolButton'),
        lineButton: document.getElementById('lineToolButton'),
        textButton: document.getElementById('textToolButton'),
        eraseButton: document.getElementById('eraseToolButton'),
        undoButton: document.getElementById('undoCardButton'),
        redoButton: document.getElementById('redoCardButton'),
        clearButton: document.getElementById('clearCardButton'),
        saveButton: document.getElementById('saveCardButton'),
        exportPngButton: document.getElementById('exportPngButton'),
        exportJsonButton: document.getElementById('exportJsonButton'),
        zoomInButton: document.getElementById('zoomInCardButton'),
        zoomOutButton: document.getElementById('zoomOutCardButton'),
        advancedLayersToggleButton: document.getElementById('toggleAdvancedLayersButton'),
        layerPanelEl: document.getElementById('playerCardLayerPanel'),
        layerButtons: {
            base: {
                select: document.getElementById('layerBaseButton'),
                visibility: document.getElementById('layerBaseVisibilityButton'),
                lock: document.getElementById('layerBaseLockButton')
            },
            eyes: {
                select: document.getElementById('layerEyesButton'),
                visibility: document.getElementById('layerEyesVisibilityButton'),
                lock: document.getElementById('layerEyesLockButton')
            },
            hair: {
                select: document.getElementById('layerHairButton'),
                visibility: document.getElementById('layerHairVisibilityButton'),
                lock: document.getElementById('layerHairLockButton')
            }
        },
        strokeColorInput: document.getElementById('cardStrokeColor'),
        fillColorInput: document.getElementById('cardFillColor'),
        sizeInput: document.getElementById('cardBrushSize'),
        messageEl: document.getElementById('playerCardPanelMessage'),
        canvasId: 'playerCardCanvas',
        onSave: function (payload) {
            global.playerCard = payload;
            renderPlayerCardPreviews();
            if (activeDraftSession) {
                completeAvatarDraft(payload);
            }
        }
    });

    bindPlayerCardDraftControls();

    btnS.onclick = function () {
        enterGame('spectator');
    };

    btn.onclick = function () {

        // Checks if the nick is valid.
        if (validNick()) {
            nickErrorText.style.opacity = 0;
            startGame('player');
        } else {
            nickErrorText.style.opacity = 1;
        }
    };

    paintCardButton.onclick = function () {
        deactivateDraftMode();
        resetPlayerCardPanelToManualMode();
        playerCardEditor.open().then(function () {
            renderPlayerCardDrafts();
        });
    };

    languageToggleButton.onclick = function () {
        i18n.setLocale(i18n.getLocale() === 'zh-CN' ? 'en' : 'zh-CN');
        applyTranslations();
        renderPlayerCardPreviews();
        renderStatusPanel();
        if (activeDraftSession) {
            renderDraftCandidates();
            updateDraftButtons();
            updateDraftTimer();
        }
    };

    var settingsMenu = document.getElementById('settingsButton');
    var settings = document.getElementById('settings');

    settingsMenu.onclick = function () {
        if (settings.style.maxHeight == '300px') {
            settings.style.maxHeight = '0px';
        } else {
            settings.style.maxHeight = '300px';
        }
    };

    playerNameInput.addEventListener('keypress', function (e) {
        var key = e.which || e.keyCode;

        if (key === global.KEY_ENTER) {
            if (validNick()) {
                nickErrorText.style.opacity = 0;
                startGame('player');
            } else {
                nickErrorText.style.opacity = 1;
            }
        }
    });
};

// TODO: Break out into GameControls.

var playerConfig = {
    border: 6,
    textColor: '#FFFFFF',
    textBorder: '#000000',
    textBorderSize: 3,
    defaultSize: 30
};

var player = {
    id: -1,
    x: global.screen.width / 2,
    y: global.screen.height / 2,
    screenWidth: global.screen.width,
    screenHeight: global.screen.height,
    target: { x: global.screen.width / 2, y: global.screen.height / 2 }
};
global.player = player;

var foods = [];
var viruses = [];
var fireFood = [];
var users = [];
var leaderboard = [];
var target = { x: player.x, y: player.y };
global.target = target;

window.canvas = new Canvas();
window.chat = new ChatClient();

var visibleBorderSetting = document.getElementById('visBord');
visibleBorderSetting.onchange = settings.toggleBorder;

var showMassSetting = document.getElementById('showMass');
showMassSetting.onchange = settings.toggleMass;

var continuitySetting = document.getElementById('continuity');
continuitySetting.onchange = settings.toggleContinuity;

var roundFoodSetting = document.getElementById('roundFood');
roundFoodSetting.onchange = settings.toggleRoundFood;

var c = window.canvas.cv;
var graph = c.getContext('2d');

function renderStatusPanel() {
    var status = '<span class="title">' + i18n.t('hud.leaderboard') + '</span>';
    for (var i = 0; i < leaderboard.length; i++) {
        status += '<br />';
        if (leaderboard[i].id == player.id) {
            if (leaderboard[i].name.length !== 0)
                status += '<span class="me">' + (i + 1) + '. ' + leaderboard[i].name + "</span>";
            else
                status += '<span class="me">' + (i + 1) + '. ' + i18n.t('hud.unnamedCell') + '</span>';
        } else {
            if (leaderboard[i].name.length !== 0)
                status += (i + 1) + '. ' + leaderboard[i].name;
            else
                status += (i + 1) + '. ' + i18n.t('hud.unnamedCell');
        }
    }
    status += formatMaterializationStatus(player);
    status += formatConnectionStatus(player);
    status += formatRelationshipStatus(player);
    status += formatBodyStatus(player);
    document.getElementById('status').innerHTML = status;
}

function renderPlayerCardPreviews() {
    var savedCard = playerCardStorage.loadPlayerCard();
    var previewDataUrl = savedCard ? savedCard.previewDataUrl : null;
    var targetPreviewDataUrl = global.targetPlayerCardPreviewDataUrl;
    var targetCardHud = document.getElementById('targetCardHud');

    document.getElementById('playerCardStartPreview').innerHTML = formatPlayerCardPreview(previewDataUrl, i18n.t('hud.playerCard'));
    document.getElementById('playerCardHud').innerHTML = formatPlayerCardPreview(previewDataUrl, i18n.t('hud.myCard'));

    if (targetPreviewDataUrl) {
        targetCardHud.style.display = 'block';
        targetCardHud.innerHTML = formatPlayerCardPreview(targetPreviewDataUrl, i18n.t('hud.targetCard'));
    } else {
        targetCardHud.style.display = 'none';
        targetCardHud.innerHTML = '';
    }
}

function applyTranslations() {
    document.title = i18n.t('appTitle');
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
        element.textContent = i18n.t(element.getAttribute('data-i18n'));
    });
    playerNameInput.placeholder = i18n.t('startMenu.namePlaceholder');
    document.getElementById('languageToggleButton').textContent = i18n.t('language.toggle');
    document.getElementById('playerCardPanelTitle').textContent = i18n.t('editor.panelTitle');
    document.getElementById('strokeLabel').textContent = i18n.t('editor.stroke');
    document.getElementById('fillLabel').textContent = i18n.t('editor.fill');
    document.getElementById('sizeLabel').textContent = i18n.t('editor.size');
    document.getElementById('selectToolButton').textContent = i18n.t('editor.select');
    document.getElementById('drawToolButton').textContent = i18n.t('editor.brush');
    document.getElementById('rectToolButton').textContent = i18n.t('editor.rect');
    document.getElementById('circleToolButton').textContent = i18n.t('editor.circle');
    document.getElementById('lineToolButton').textContent = i18n.t('editor.line');
    document.getElementById('textToolButton').textContent = i18n.t('editor.text');
    document.getElementById('eraseToolButton').textContent = i18n.t('editor.eraser');
    document.getElementById('undoCardButton').textContent = i18n.t('editor.undo');
    document.getElementById('redoCardButton').textContent = i18n.t('editor.redo');
    document.getElementById('clearCardButton').textContent = i18n.t('editor.clear');
    document.getElementById('saveCardButton').textContent = activeDraftSession ? i18n.t('draft.confirm') : i18n.t('editor.save');
    document.getElementById('exportPngButton').textContent = i18n.t('editor.exportPngButton');
    document.getElementById('exportJsonButton').textContent = i18n.t('editor.exportJsonButton');
    document.getElementById('closeCardPanelButton').textContent = activeDraftSession ? i18n.t('draft.cancel') : i18n.t('editor.close');
    document.getElementById('zoomOutCardButton').textContent = i18n.t('editor.zoomOut');
    document.getElementById('zoomInCardButton').textContent = i18n.t('editor.zoomIn');
    document.getElementById('toggleAdvancedLayersButton').textContent = i18n.t('editor.advancedLayers');
    document.getElementById('playerCardLayerLabel').textContent = i18n.t('editor.layers');
    document.getElementById('newDraftImageButton').textContent = i18n.t('editor.newImage');
    document.getElementById('saveDraftImageButton').textContent = i18n.t('editor.saveDraft');
    document.getElementById('toggleDraftHistoryButton').textContent = i18n.t('editor.draftHistory');
    document.getElementById('playerCardDraftEmpty').textContent = i18n.t('editor.noDrafts');
}

function getDraftPanelElements() {
    return {
        panel: document.getElementById('avatarDraftPanel'),
        timer: document.getElementById('avatarDraftTimer'),
        hint: document.getElementById('avatarDraftHint'),
        candidates: document.getElementById('avatarDraftCandidates'),
        rerollButton: document.getElementById('avatarDraftRerollButton'),
        skipButton: document.getElementById('avatarDraftSkipButton'),
        saveButton: document.getElementById('saveCardButton'),
        closeButton: document.getElementById('closeCardPanelButton')
    };
}

function resetPlayerCardPanelToManualMode() {
    var draftUi = getDraftPanelElements();
    draftUi.panel.classList.remove('active');
    draftUi.timer.textContent = '';
    draftUi.hint.textContent = '';
    draftUi.candidates.innerHTML = '';
    document.getElementById('playerCardDraftHistory').classList.remove('open');
    document.getElementById('playerCardDraftManager').classList.remove('hidden');
    applyTranslations();
}

function createDraftTimestampLabel(isoString) {
    var date = new Date(isoString);
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var hour = String(date.getHours()).padStart(2, '0');
    var minute = String(date.getMinutes()).padStart(2, '0');
    return month + '-' + day + ' ' + hour + ':' + minute;
}

function renderPlayerCardDrafts() {
    var drafts = playerCardDraftStore.loadDrafts();
    var listEl = document.getElementById('playerCardDraftList');
    var emptyEl = document.getElementById('playerCardDraftEmpty');

    listEl.innerHTML = drafts.map(function (draft) {
        return [
            '<button type="button" class="player-card-draft-item" data-draft-id="' + draft.id + '">',
            '<img class="player-card-draft-item-preview" src="' + draft.previewDataUrl + '" alt="draft preview" />',
            '<span class="player-card-draft-item-time">' + createDraftTimestampLabel(draft.updatedAt) + '</span>',
            '</button>'
        ].join('');
    }).join('');

    emptyEl.style.display = drafts.length ? 'none' : 'block';

    Array.prototype.forEach.call(listEl.querySelectorAll('[data-draft-id]'), function (button) {
        button.addEventListener('click', function () {
            var draft = drafts.find(function (entry) {
                return entry.id === button.getAttribute('data-draft-id');
            });
            if (!draft) {
                return;
            }
            playerCardEditor.loadLayerPayload(draft.layers, draft.activeLayerId, draft.contentScale).then(function () {
                playerCardEditor.setMessage(i18n.t('editor.draftLoaded'));
            });
        });
    });
}

function saveCurrentPlayerCardAsDraft() {
    var payload = playerCardEditor.exportPayload();
    if (!payload || !playerCardLayers.hasAnyContent(payload.layers)) {
        playerCardEditor.setMessage(i18n.t('editor.emptyDraft'));
        return null;
    }

    var draft = playerCardDraftStore.saveDraft(payload);
    renderPlayerCardDrafts();
    playerCardEditor.setMessage(i18n.t('editor.draftSaved'));
    return draft;
}

function bindPlayerCardDraftControls() {
    document.getElementById('newDraftImageButton').addEventListener('click', function () {
        var hadContent = playerCardEditor.hasContent();
        if (hadContent) {
            saveCurrentPlayerCardAsDraft();
        }
        playerCardEditor.loadEmptyState().then(function () {
            playerCardEditor.setMessage(i18n.t(hadContent ? 'editor.newImageFromDraft' : 'editor.newImageBlank'));
        });
    });

    document.getElementById('saveDraftImageButton').addEventListener('click', function () {
        saveCurrentPlayerCardAsDraft();
    });

    document.getElementById('toggleDraftHistoryButton').addEventListener('click', function () {
        var historyEl = document.getElementById('playerCardDraftHistory');
        historyEl.classList.toggle('open');
        if (historyEl.classList.contains('open')) {
            renderPlayerCardDrafts();
        }
    });
}

function clearDraftTimer() {
    if (draftTimerHandle) {
        window.clearInterval(draftTimerHandle);
        draftTimerHandle = null;
    }
}

function deactivateDraftMode() {
    activeDraftSession = null;
    clearDraftTimer();
    resetPlayerCardPanelToManualMode();
}

function formatMissingPartLabel(partType) {
    return i18n.t('parts.' + partType.toUpperCase());
}

function renderDraftCandidates() {
    var draftUi = getDraftPanelElements();
    draftUi.candidates.innerHTML = activeDraftSession.candidates.map(function (candidate) {
        var isActive = activeDraftSession.selectedCandidateId === candidate.id ? ' active' : '';
        return [
            '<button type="button" class="avatar-draft-candidate' + isActive + '" data-candidate-id="' + candidate.id + '">',
            '<img class="avatar-draft-candidate-preview" src="' + (avatarDraftPreview.createDraftPreviewDataUrl(candidate) || '') + '" alt="' + candidate.previewMeta.title + '" />',
            '<span class="avatar-draft-candidate-title">' + candidate.previewMeta.title + '</span>',
            '<span class="avatar-draft-candidate-subtitle">' + (candidate.previewMeta.subtitleKey ? i18n.t(candidate.previewMeta.subtitleKey) : candidate.previewMeta.subtitle) + '</span>',
            '<span class="avatar-draft-candidate-missing">' + i18n.t('draft.missing', { part: formatMissingPartLabel(candidate.missingPartType) }) + '</span>',
            '</button>'
        ].join('');
    }).join('');

    Array.prototype.forEach.call(draftUi.candidates.querySelectorAll('[data-candidate-id]'), function (button) {
        button.addEventListener('click', function () {
            selectDraftCandidate(button.getAttribute('data-candidate-id'));
        });
    });
}

function selectDraftCandidate(candidateId) {
    var candidate = activeDraftSession.candidates.find(function (entry) {
        return entry.id === candidateId;
    });
    if (!candidate) {
        return;
    }

    activeDraftSession.selectedCandidateId = candidateId;
    renderDraftCandidates();
    playerCardEditor.loadCanvasJson(candidate.baseShapeData);
    getDraftPanelElements().hint.textContent = i18n.t('draft.fillHint', { part: formatMissingPartLabel(candidate.missingPartType) });
}

function updateDraftTimer() {
    if (!activeDraftSession) {
        return;
    }

    var remainingMs = Math.max(0, activeDraftSession.deadlineAt - Date.now());
    var remainingSeconds = Math.ceil(remainingMs / 1000);
    getDraftPanelElements().timer.textContent = i18n.t('draft.timeLeft', { seconds: remainingSeconds });

    if (remainingMs <= 0) {
        clearDraftTimer();
        playerCardEditor.saveCurrent();
    }
}

function buildDraftSession(playerType) {
    var historyEntries = avatarHistoryStore.loadHistory();
    var candidates = avatarDraftCandidates.buildDraftCandidates({
        config: avatarDraftConfig,
        historyEntries: historyEntries
    });

    return {
        playerType: playerType,
        candidates: candidates,
        selectedCandidateId: candidates[0] ? candidates[0].id : null,
        remainingRerolls: avatarDraftConfig.allowRedrawCount,
        deadlineAt: Date.now() + (avatarDraftConfig.drawTimeLimitSeconds * 1000)
    };
}

function rerollDraftCandidates() {
    if (!activeDraftSession || activeDraftSession.remainingRerolls <= 0) {
        return;
    }

    activeDraftSession.remainingRerolls -= 1;
    activeDraftSession.candidates = avatarDraftCandidates.buildDraftCandidates({
        config: avatarDraftConfig,
        historyEntries: avatarHistoryStore.loadHistory()
    });
    activeDraftSession.selectedCandidateId = activeDraftSession.candidates[0] ? activeDraftSession.candidates[0].id : null;
    activeDraftSession.deadlineAt = Date.now() + (avatarDraftConfig.drawTimeLimitSeconds * 1000);
    renderDraftCandidates();
    selectDraftCandidate(activeDraftSession.selectedCandidateId);
    updateDraftButtons();
}

function updateDraftButtons() {
    var draftUi = getDraftPanelElements();
    draftUi.rerollButton.style.display = activeDraftSession ? 'inline-block' : 'none';
    draftUi.skipButton.style.display = activeDraftSession && avatarDraftConfig.allowSkipForDebug ? 'inline-block' : 'none';
    draftUi.rerollButton.disabled = !activeDraftSession || activeDraftSession.remainingRerolls <= 0;
    draftUi.rerollButton.textContent = i18n.t('draft.reroll', { count: activeDraftSession ? activeDraftSession.remainingRerolls : 0 });
}

function beginAvatarDraftFlow(playerType) {
    activeDraftSession = buildDraftSession(playerType);

    var draftUi = getDraftPanelElements();
    draftUi.panel.classList.add('active');
    document.getElementById('playerCardDraftManager').classList.add('hidden');
    draftUi.saveButton.textContent = i18n.t('draft.confirm');
    draftUi.closeButton.textContent = i18n.t('draft.cancel');

    updateDraftButtons();
    renderDraftCandidates();

    playerCardEditor.open().then(function () {
        selectDraftCandidate(activeDraftSession.selectedCandidateId);
    });

    draftUi.rerollButton.onclick = rerollDraftCandidates;
    draftUi.skipButton.onclick = function () {
        deactivateDraftMode();
        playerCardEditor.close();
        enterGame(playerType);
    };
    draftUi.closeButton.onclick = function () {
        deactivateDraftMode();
        playerCardEditor.close();
    };

    clearDraftTimer();
    updateDraftTimer();
    draftTimerHandle = window.setInterval(updateDraftTimer, 250);
}

function completeAvatarDraft(payload) {
    if (!activeDraftSession) {
        return;
    }

    var selectedCandidate = activeDraftSession.candidates.find(function (candidate) {
        return candidate.id === activeDraftSession.selectedCandidateId;
    });
    var finalPayload = Object.assign({}, payload, {
        templateId: selectedCandidate.templateId,
        missingPartType: selectedCandidate.missingPartType,
        sourceType: selectedCandidate.sourceType
    });

    playerCardStorage.savePlayerCard(finalPayload);
    avatarHistoryStore.addHistoryEntry(avatarHistoryStore.createHistoryEntry(finalPayload));
    global.playerCard = finalPayload;
    renderPlayerCardPreviews();

    var playerType = activeDraftSession.playerType;
    deactivateDraftMode();
    playerCardEditor.close();
    enterGame(playerType);
}

function findConnectedTargetCardPreview(userData) {
    if (!player.connectionTargetId || !userData) {
        return null;
    }

    for (var i = 0; i < userData.length; i++) {
        if (userData[i].id === player.connectionTargetId) {
            return userData[i].playerCardPreviewDataUrl || null;
        }
    }

    return null;
}

$("#feed").click(function () {
    socket.emit('1');
    window.canvas.reenviar = false;
});

$("#split").click(function () {
    socket.emit('2');
    window.canvas.reenviar = false;
});

function handleDisconnect() {
    socket.close();
    if (!global.kicked) { // We have a more specific error message 
        render.drawErrorMessage(i18n.t('system.disconnected'), graph, global.screen);
    }
}

// socket stuff.
function setupSocket(socket) {
    // Handle ping.
    socket.on('pongcheck', function () {
        var latency = Date.now() - global.startPingTime;
        debug('Latency: ' + latency + 'ms');
        window.chat.addSystemLine(i18n.t('system.ping', { latency: latency }));
    });

    // Handle error.
    socket.on('connect_error', handleDisconnect);
    socket.on('disconnect', handleDisconnect);

    // Handle connection.
    socket.on('welcome', function (playerSettings, gameSizes) {
        player = playerSettings;
        player.name = global.playerName;
        player.screenWidth = global.screen.width;
        player.screenHeight = global.screen.height;
        player.target = window.canvas.target;
        player.playerCardPreviewDataUrl = global.playerCard ? global.playerCard.previewDataUrl : null;
        global.player = player;
        window.chat.player = player;
        socket.emit('gotit', player);
        global.gameStart = true;
        window.chat.addSystemLine(i18n.t('system.connected'));
        window.chat.addSystemLine(i18n.t('system.help'));
        if (global.mobile) {
            document.getElementById('gameAreaWrapper').removeChild(document.getElementById('chatbox'));
        }
        c.focus();
        global.game.width = gameSizes.width;
        global.game.height = gameSizes.height;
        resize();
    });

    socket.on('playerDied', (data) => {
        const player = isUnnamedCell(data.playerEatenName) ? i18n.t('hud.unnamedCell') : data.playerEatenName;
        //const killer = isUnnamedCell(data.playerWhoAtePlayerName) ? 'An unnamed cell' : data.playerWhoAtePlayerName;

        //window.chat.addSystemLine('{GAME} - <b>' + (player) + '</b> was eaten by <b>' + (killer) + '</b>');
        window.chat.addSystemLine(i18n.t('system.playerEaten', { name: player }));
    });

    socket.on('playerDisconnect', (data) => {
        window.chat.addSystemLine(i18n.t('system.playerDisconnected', {
            name: isUnnamedCell(data.name) ? i18n.t('hud.unnamedCell') : data.name
        }));
    });

    socket.on('playerJoin', (data) => {
        window.chat.addSystemLine(i18n.t('system.playerJoined', {
            name: isUnnamedCell(data.name) ? i18n.t('hud.unnamedCell') : data.name
        }));
    });

    socket.on('leaderboard', (data) => {
        leaderboard = data.leaderboard;
        renderStatusPanel();
    });

    socket.on('serverMSG', function (data) {
        window.chat.addSystemLine(data);
    });

    // Chat.
    socket.on('serverSendPlayerChat', function (data) {
        window.chat.addChatLine(data.sender, data.message, false);
    });

    // Handle movement.
    socket.on('serverTellPlayerMove', function (playerData, userData, foodsList, massList, virusList) {
        if (global.playerType == 'player') {
            player.x = playerData.x;
            player.y = playerData.y;
            player.hue = playerData.hue;
            player.massTotal = playerData.massTotal;
            player.materialization = playerData.materialization;
            player.materializationStage = playerData.materializationStage;
            player.connectionStatus = playerData.connectionStatus;
            player.connectionTargetId = playerData.connectionTargetId;
            player.connectionTargetName = playerData.connectionTargetName;
            player.intimacy = playerData.intimacy;
            player.spike = playerData.spike;
            player.pollution = playerData.pollution;
            player.bodyParts = playerData.bodyParts;
            player.bodyPartCount = playerData.bodyPartCount;
            player.bodyPartCounts = playerData.bodyPartCounts;
            player.playerCardPreviewDataUrl = playerData.playerCardPreviewDataUrl;
            player.cells = playerData.cells;
        }
        users = userData;
        global.targetPlayerCardPreviewDataUrl = findConnectedTargetCardPreview(userData);
        foods = foodsList;
        viruses = virusList;
        fireFood = massList;
        renderStatusPanel();
        renderPlayerCardPreviews();
    });

    // Death.
    socket.on('RIP', function () {
        global.gameStart = false;
        render.drawErrorMessage(i18n.t('system.youDied'), graph, global.screen);
        window.setTimeout(() => {
            document.getElementById('gameAreaWrapper').style.opacity = 0;
            document.getElementById('startMenuWrapper').style.maxHeight = '1000px';
            if (global.animLoopHandle) {
                window.cancelAnimationFrame(global.animLoopHandle);
                global.animLoopHandle = undefined;
            }
        }, 2500);
    });

    socket.on('kick', function (reason) {
        global.gameStart = false;
        global.kicked = true;
        if (reason !== '') {
            render.drawErrorMessage(i18n.t('system.kickedReason', { reason: reason }), graph, global.screen);
        }
        else {
            render.drawErrorMessage(i18n.t('system.kicked'), graph, global.screen);
        }
        socket.close();
    });
}

const isUnnamedCell = (name) => name.length < 1;

const getPosition = (entity, player, screen) => {
    return {
        x: entity.x - player.x + screen.width / 2,
        y: entity.y - player.y + screen.height / 2
    }
}

window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

window.cancelAnimFrame = (function (handle) {
    return window.cancelAnimationFrame ||
        window.mozCancelAnimationFrame;
})();

function animloop() {
    global.animLoopHandle = window.requestAnimFrame(animloop);
    gameLoop();
}

function gameLoop() {
    if (global.gameStart) {
        graph.fillStyle = global.backgroundColor;
        graph.fillRect(0, 0, global.screen.width, global.screen.height);

        render.drawGrid(global, player, global.screen, graph);
        foods.forEach(food => {
            let position = getPosition(food, player, global.screen);
            render.drawFood(position, food, graph);
        });
        fireFood.forEach(fireFood => {
            let position = getPosition(fireFood, player, global.screen);
            render.drawFireFood(position, fireFood, playerConfig, graph);
        });
        viruses.forEach(virus => {
            let position = getPosition(virus, player, global.screen);
            render.drawVirus(position, virus, graph);
        });


        let borders = { // Position of the borders on the screen
            left: global.screen.width / 2 - player.x,
            right: global.screen.width / 2 + global.game.width - player.x,
            top: global.screen.height / 2 - player.y,
            bottom: global.screen.height / 2 + global.game.height - player.y
        }
        if (global.borderDraw) {
            render.drawBorder(borders, graph);
        }

        var cellsToDraw = [];
        for (var i = 0; i < users.length; i++) {
            let color = 'hsl(' + users[i].hue + ', 100%, 50%)';
            let borderColor = 'hsl(' + users[i].hue + ', 100%, 45%)';
            for (var j = 0; j < users[i].cells.length; j++) {
                cellsToDraw.push({
                    color: color,
                    borderColor: borderColor,
                    mass: users[i].cells[j].mass,
                    name: users[i].name,
                    playerCardPreviewDataUrl: users[i].playerCardPreviewDataUrl,
                    radius: users[i].cells[j].radius,
                    x: users[i].cells[j].x - player.x + global.screen.width / 2,
                    y: users[i].cells[j].y - player.y + global.screen.height / 2
                });
            }
        }
        cellsToDraw.sort(function (obj1, obj2) {
            return obj1.mass - obj2.mass;
        });
        render.drawCells(cellsToDraw, playerConfig, global.toggleMassState, borders, graph);

        socket.emit('0', window.canvas.target); // playerSendTarget "Heartbeat".
    }
}

window.addEventListener('resize', resize);

function resize() {
    if (!socket) return;

    player.screenWidth = c.width = global.screen.width = global.playerType == 'player' ? window.innerWidth : global.game.width;
    player.screenHeight = c.height = global.screen.height = global.playerType == 'player' ? window.innerHeight : global.game.height;

    if (global.playerType == 'spectator') {
        player.x = global.game.width / 2;
        player.y = global.game.height / 2;
    }

    socket.emit('windowResized', { screenWidth: global.screen.width, screenHeight: global.screen.height });
}
