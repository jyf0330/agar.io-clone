var io = require('socket.io-client');
var render = require('./render');
var ChatClient = require('./chat-client');
var Canvas = require('./canvas');
var global = require('./global');
var formatMaterializationStatus = require('./materialization-status');
var formatConnectionStatus = require('./connection-status');
var formatRelationshipStatus = require('./relationship-status');
var formatBodyStatus = require('./body-status');
var formatGhostDebugStatus = require('./ghost-debug-status');
var formatPetStatus = require('./pet-status');
var playerCardStorage = require('./player-card-storage');
var formatPlayerCardPreview = require('./player-card-preview');
var createPlayerCardEditor = require('./player-card-editor');
var createAvatarDraftController = require('./avatar-draft-controller');
var createSocketController = require('./socket-controller');
var createSpeechBubble = require('./ui/speech-bubble');
var createPaintToast = require('./ui/paint-toast');
var createChatInput = require('./ui/chat-input');
var createSettlementPanel = require('./ui/settlement-panel');
var createBodySignatureController = require('./body-signature-controller');
var bodySignatureStorage = require('./body-signature-storage');
var i18n = require('./i18n');
var socketEmit = require('./socket-emit');

var playerNameInput = document.getElementById('playerNameInput');
var recordConsentInput = document.getElementById('recordConsentInput');
var socket;
var playerCardEditor;
var avatarDraftController;
var socketController;
var speechBubble;
var paintToast;
var chatInput;
var settlementPanel;
var bodySignatureController;
var hideStartMenuOnLoad = false;
var npcFeaturesDisabled = window.location.search.indexOf('npc=0') !== -1 || window.V5_NPC_ENABLED === false;
var npcFeaturesEnabled = !npcFeaturesDisabled || window.location.search.indexOf('npc=1') !== -1 || window.V3_NPC_ENABLED === true;

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
    global.bodySignature = bodySignatureStorage.loadBodySignature();
    global.consentToRecord = type === 'player' && (!recordConsentInput || recordConsentInput.checked !== false);
    global.targetPlayerCardPreviewDataUrl = null;
    global.disconnected = false;
    global.kicked = false;

    global.screen.width = window.innerWidth;
    global.screen.height = window.innerHeight;

    document.getElementById('startMenuWrapper').style.maxHeight = '0px';
    document.getElementById('gameAreaWrapper').style.opacity = 1;
    if (chatInput && npcFeaturesEnabled) {
        chatInput.show();
    }
    socket = socketController.connect(type);
    if (!global.animLoopHandle)
        animloop();
}

function startGame(type) {
    if (bodySignatureController && bodySignatureController.shouldOpen(type)) {
        bodySignatureController.open(type, function (payload) {
            global.bodySignature = payload;
            startGame(type);
        });
        return;
    }

    if (avatarDraftController.shouldStartDraft(type)) {
        avatarDraftController.beginDraftFlow(type);
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
            if (avatarDraftController) {
                avatarDraftController.handlePlayerCardSaved(payload);
            }
        }
    });

    bodySignatureController = createBodySignatureController({
        document: document,
        i18n: i18n,
        panelEl: document.getElementById('bodySignaturePanel'),
        canvasEl: document.getElementById('bodySignatureCanvas'),
        bodyImageEl: document.getElementById('bodySignatureBodyImage'),
        refsEl: document.getElementById('bodySignatureRefs'),
        clearButton: document.getElementById('bodySignatureClearButton'),
        submitButton: document.getElementById('bodySignatureSubmitButton'),
        skipButton: document.getElementById('bodySignatureSkipButton'),
        messageEl: document.getElementById('bodySignatureMessage')
    });

    avatarDraftController = createAvatarDraftController({
        document: document,
        window: window,
        i18n: i18n,
        global: global,
        playerCardEditor: playerCardEditor,
        playerCardStorage: playerCardStorage,
        renderPlayerCardPreviews: renderPlayerCardPreviews,
        applyTranslations: applyTranslations,
        enterGame: enterGame
    });
    avatarDraftController.bindControls();
    speechBubble = createSpeechBubble({
        document: document,
        window: window
    });
    paintToast = createPaintToast({
        document: document,
        window: window
    });
    chatInput = createChatInput({
        document: document
    });
    settlementPanel = createSettlementPanel({
        document: document
    });
    chatInput.hide();
    chatInput.setSendHandler(function (text) {
        return window.chat.sendChatText(text);
    });

    socketController = createSocketController({
        io: io,
        document: document,
        window: window,
        global: global,
        render: render,
        i18n: i18n,
        graph: graph,
        canvasElement: c,
        debug: debug,
        getChat: function () {
            return window.chat;
        },
        getPlayer: function () {
            return player;
        },
        getCanvasTarget: function () {
            return window.canvas.target;
        },
        getPlayerCardPreviewDataUrl: function () {
            return global.playerCard ? global.playerCard.previewDataUrl : null;
        },
        assignSocket: function (nextSocket) {
            socket = nextSocket;
            window.chat.socket = nextSocket;
            window.canvas.socket = nextSocket;
            global.socket = nextSocket;
            if (nextSocket) {
                window.chat.registerFunctions();
            }
        },
        renderPlayerCardPreviews: renderPlayerCardPreviews,
        renderStatusPanel: renderStatusPanel,
        resize: resize,
        speechBubble: speechBubble,
        paintToast: paintToast,
        chatInput: npcFeaturesEnabled ? chatInput : null,
        settlementPanel: settlementPanel,
        setLeaderboard: function (nextLeaderboard) {
            leaderboard = nextLeaderboard;
        },
        setPlayer: function (nextPlayer) {
            player = nextPlayer;
            global.player = nextPlayer;
        },
        setWorldState: function (nextWorldState) {
            users = nextWorldState.users;
            foods = nextWorldState.foods;
            fireFood = nextWorldState.fireFood;
            viruses = nextWorldState.viruses;
            partLoot = nextWorldState.partLoot;
            ghosts = nextWorldState.ghosts;
        }
    });

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
        avatarDraftController.openManualEditor();
    };

    languageToggleButton.onclick = function () {
        i18n.setLocale(i18n.getLocale() === 'zh-CN' ? 'en' : 'zh-CN');
        applyTranslations();
        renderPlayerCardPreviews();
        renderStatusPanel();
        avatarDraftController.handleLocaleChanged();
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

    if (hideStartMenuOnLoad) {
        enterGame('player');
    }
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
var partLoot = [];
var ghosts = [];
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
    status += formatPetStatus(player);
    status += formatGhostDebugStatus(player);
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
    document.getElementById('exportPngButton').textContent = i18n.t('editor.exportPngButton');
    document.getElementById('exportJsonButton').textContent = i18n.t('editor.exportJsonButton');
    document.getElementById('zoomOutCardButton').textContent = i18n.t('editor.zoomOut');
    document.getElementById('zoomInCardButton').textContent = i18n.t('editor.zoomIn');
    document.getElementById('toggleAdvancedLayersButton').textContent = i18n.t('editor.advancedLayers');
    document.getElementById('playerCardLayerLabel').textContent = i18n.t('editor.layers');
    document.getElementById('newDraftImageButton').textContent = i18n.t('editor.newImage');
    document.getElementById('saveDraftImageButton').textContent = i18n.t('editor.saveDraft');
    document.getElementById('toggleDraftHistoryButton').textContent = i18n.t('editor.draftHistory');
    document.getElementById('playerCardDraftEmpty').textContent = i18n.t('editor.noDrafts');
    var draftModeActive = avatarDraftController && avatarDraftController.isActive();
    document.getElementById('saveCardButton').textContent = draftModeActive ? i18n.t('draft.confirm') : i18n.t('editor.save');
    document.getElementById('closeCardPanelButton').textContent = draftModeActive ? i18n.t('draft.cancel') : i18n.t('editor.close');
    document.getElementById('bodySignatureTitle').textContent = i18n.t('signature.title');
    document.getElementById('bodySignatureSubtitle').textContent = i18n.t('signature.subtitle');
    document.getElementById('bodySignatureMissingLabel').textContent = i18n.t('signature.missingPart');
    document.getElementById('bodySignatureClearButton').textContent = i18n.t('signature.clear');
    document.getElementById('bodySignatureSubmitButton').textContent = i18n.t('signature.submit');
    document.getElementById('bodySignatureSkipButton').textContent = i18n.t('signature.skip');
}

$("#feed").click(function () {
    if (socketEmit.emitIfReady(socket, '1')) {
        window.canvas.reenviar = false;
    }
});

$("#split").click(function () {
    if (socketEmit.emitIfReady(socket, '2')) {
        window.canvas.reenviar = false;
    }
});

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
        partLoot.forEach(loot => {
            let position = getPosition(loot, player, global.screen);
            render.drawPartLoot(position, loot, graph);
        });
        ghosts.forEach(ghost => {
            let position = getPosition(ghost, player, global.screen);
            render.drawGhost(position, ghost, graph);
        });
        if (player.activePet && player.activePet.active && typeof player.activePet.x === 'number' && typeof player.activePet.y === 'number') {
            let petPosition = getPosition(player.activePet, player, global.screen);
            render.drawPet(petPosition, player.activePet, graph);
        }


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
        if (speechBubble) {
            speechBubble.render(users, player, global.screen);
        }

        socketEmit.emitIfReady(socket, '0', window.canvas.target); // playerSendTarget "Heartbeat".
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

    socketEmit.emitIfReady(socket, 'windowResized', {
        screenWidth: global.screen.width,
        screenHeight: global.screen.height
    });
}
