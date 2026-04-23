'use strict';

var avatarDraftConfig = require('./avatar-draft-config');
var avatarHistoryStore = require('./avatar-history-store');
var avatarDraftCandidates = require('./avatar-draft-candidates');
var avatarDraftPreview = require('./avatar-draft-preview');
var playerCardDraftStore = require('./player-card-draft-store');
var playerCardLayers = require('./player-card-layers');

function createAvatarDraftController(options) {
    var activeDraftSession = null;
    var draftTimerHandle = null;

    function getDraftPanelElements() {
        return {
            panel: options.document.getElementById('avatarDraftPanel'),
            timer: options.document.getElementById('avatarDraftTimer'),
            hint: options.document.getElementById('avatarDraftHint'),
            candidates: options.document.getElementById('avatarDraftCandidates'),
            rerollButton: options.document.getElementById('avatarDraftRerollButton'),
            skipButton: options.document.getElementById('avatarDraftSkipButton'),
            saveButton: options.document.getElementById('saveCardButton'),
            closeButton: options.document.getElementById('closeCardPanelButton')
        };
    }

    function resetPlayerCardPanelToManualMode() {
        var draftUi = getDraftPanelElements();
        draftUi.panel.classList.remove('active');
        draftUi.timer.textContent = '';
        draftUi.hint.textContent = '';
        draftUi.candidates.innerHTML = '';
        options.document.getElementById('playerCardDraftHistory').classList.remove('open');
        options.document.getElementById('playerCardDraftManager').classList.remove('hidden');
        options.applyTranslations();
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
        var listEl = options.document.getElementById('playerCardDraftList');
        var emptyEl = options.document.getElementById('playerCardDraftEmpty');

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
                options.playerCardEditor.loadLayerPayload(draft.layers, draft.activeLayerId, draft.contentScale).then(function () {
                    options.playerCardEditor.setMessage(options.i18n.t('editor.draftLoaded'));
                });
            });
        });
    }

    function saveCurrentPlayerCardAsDraft() {
        var payload = options.playerCardEditor.exportPayload();
        if (!payload || !playerCardLayers.hasAnyContent(payload.layers)) {
            options.playerCardEditor.setMessage(options.i18n.t('editor.emptyDraft'));
            return null;
        }

        var draft = playerCardDraftStore.saveDraft(payload);
        renderPlayerCardDrafts();
        options.playerCardEditor.setMessage(options.i18n.t('editor.draftSaved'));
        return draft;
    }

    function bindControls() {
        options.document.getElementById('newDraftImageButton').addEventListener('click', function () {
            var hadContent = options.playerCardEditor.hasContent();
            if (hadContent) {
                saveCurrentPlayerCardAsDraft();
            }
            options.playerCardEditor.loadEmptyState().then(function () {
                options.playerCardEditor.setMessage(options.i18n.t(hadContent ? 'editor.newImageFromDraft' : 'editor.newImageBlank'));
            });
        });

        options.document.getElementById('saveDraftImageButton').addEventListener('click', function () {
            saveCurrentPlayerCardAsDraft();
        });

        options.document.getElementById('toggleDraftHistoryButton').addEventListener('click', function () {
            var historyEl = options.document.getElementById('playerCardDraftHistory');
            historyEl.classList.toggle('open');
            if (historyEl.classList.contains('open')) {
                renderPlayerCardDrafts();
            }
        });
    }

    function clearDraftTimer() {
        if (draftTimerHandle) {
            options.window.clearInterval(draftTimerHandle);
            draftTimerHandle = null;
        }
    }

    function deactivateDraftMode() {
        activeDraftSession = null;
        clearDraftTimer();
        resetPlayerCardPanelToManualMode();
    }

    function formatMissingPartLabel(partType) {
        return options.i18n.t('parts.' + partType.toUpperCase());
    }

    function renderDraftCandidates() {
        var draftUi = getDraftPanelElements();
        draftUi.candidates.innerHTML = activeDraftSession.candidates.map(function (candidate) {
            var isActive = activeDraftSession.selectedCandidateId === candidate.id ? ' active' : '';
            return [
                '<button type="button" class="avatar-draft-candidate' + isActive + '" data-candidate-id="' + candidate.id + '">',
                '<img class="avatar-draft-candidate-preview" src="' + (avatarDraftPreview.createDraftPreviewDataUrl(candidate) || '') + '" alt="' + candidate.previewMeta.title + '" />',
                '<span class="avatar-draft-candidate-title">' + candidate.previewMeta.title + '</span>',
                '<span class="avatar-draft-candidate-subtitle">' + (candidate.previewMeta.subtitleKey ? options.i18n.t(candidate.previewMeta.subtitleKey) : candidate.previewMeta.subtitle) + '</span>',
                '<span class="avatar-draft-candidate-missing">' + options.i18n.t('draft.missing', {part: formatMissingPartLabel(candidate.missingPartType)}) + '</span>',
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
        options.playerCardEditor.loadCanvasJson(candidate.baseShapeData);
        getDraftPanelElements().hint.textContent = options.i18n.t('draft.fillHint', {part: formatMissingPartLabel(candidate.missingPartType)});
    }

    function updateDraftTimer() {
        if (!activeDraftSession) {
            return;
        }

        var remainingMs = Math.max(0, activeDraftSession.deadlineAt - Date.now());
        var remainingSeconds = Math.ceil(remainingMs / 1000);
        getDraftPanelElements().timer.textContent = options.i18n.t('draft.timeLeft', {seconds: remainingSeconds});

        if (remainingMs <= 0) {
            clearDraftTimer();
            options.playerCardEditor.saveCurrent();
        }
    }

    function buildDraftSession(playerType) {
        return {
            playerType: playerType,
            candidates: avatarDraftCandidates.buildDraftCandidates({
                config: avatarDraftConfig,
                historyEntries: avatarHistoryStore.loadHistory()
            }),
            selectedCandidateId: null,
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
        draftUi.rerollButton.textContent = options.i18n.t('draft.reroll', {count: activeDraftSession ? activeDraftSession.remainingRerolls : 0});
    }

    function beginDraftFlow(playerType) {
        activeDraftSession = buildDraftSession(playerType);
        activeDraftSession.selectedCandidateId = activeDraftSession.candidates[0] ? activeDraftSession.candidates[0].id : null;

        var draftUi = getDraftPanelElements();
        draftUi.panel.classList.add('active');
        options.document.getElementById('playerCardDraftManager').classList.add('hidden');
        draftUi.saveButton.textContent = options.i18n.t('draft.confirm');
        draftUi.closeButton.textContent = options.i18n.t('draft.cancel');

        updateDraftButtons();
        renderDraftCandidates();

        options.playerCardEditor.open().then(function () {
            selectDraftCandidate(activeDraftSession.selectedCandidateId);
        });

        draftUi.rerollButton.onclick = rerollDraftCandidates;
        draftUi.skipButton.onclick = function () {
            deactivateDraftMode();
            options.playerCardEditor.close();
            options.enterGame(playerType);
        };
        draftUi.closeButton.onclick = function () {
            deactivateDraftMode();
            options.playerCardEditor.close();
        };

        clearDraftTimer();
        updateDraftTimer();
        draftTimerHandle = options.window.setInterval(updateDraftTimer, 250);
    }

    function completeDraft(payload) {
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

        options.playerCardStorage.savePlayerCard(finalPayload);
        avatarHistoryStore.addHistoryEntry(avatarHistoryStore.createHistoryEntry(finalPayload));
        options.global.playerCard = finalPayload;
        options.renderPlayerCardPreviews();

        var playerType = activeDraftSession.playerType;
        deactivateDraftMode();
        options.playerCardEditor.close();
        options.enterGame(playerType);
    }

    return {
        bindControls: bindControls,
        beginDraftFlow: beginDraftFlow,
        deactivateDraftMode: deactivateDraftMode,
        handleLocaleChanged: function () {
            if (!activeDraftSession) {
                return;
            }

            renderDraftCandidates();
            updateDraftButtons();
            updateDraftTimer();
        },
        handlePlayerCardSaved: function (payload) {
            if (activeDraftSession) {
                completeDraft(payload);
            }
        },
        isActive: function () {
            return !!activeDraftSession;
        },
        openManualEditor: function () {
            deactivateDraftMode();
            resetPlayerCardPanelToManualMode();
            return options.playerCardEditor.open().then(function () {
                renderPlayerCardDrafts();
            });
        },
        shouldStartDraft: function (playerType) {
            return playerType === 'player' && avatarDraftConfig.enableAvatarDraftFeature;
        }
    };
}

module.exports = createAvatarDraftController;
