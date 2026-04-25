'use strict';

function createText(document, tagName, className, text) {
    const node = document.createElement(tagName);
    node.className = className;
    node.textContent = text;
    return node;
}

function formatPartLine(part) {
    const safePart = part || {};
    const stats = Array.isArray(safePart.stats) && safePart.stats.length ? safePart.stats.join(', ') : 'no stats';
    const origin = safePart.originPlayerName || safePart.originPlayerId || 'unknown';
    const removed = safePart.removed ? ' / removed: ' + safePart.removedEventType : '';

    return [
        safePart.partType || 'UNKNOWN',
        safePart.displayName || 'Unknown Part',
        stats,
        'source: ' + (safePart.sourceType || 'unknown'),
        'origin: ' + origin,
        'got: ' + (safePart.acquired || 'unknown') + removed
    ].join(' | ');
}

function formatKeyEventLine(event) {
    const safeEvent = event || {};
    const coordinates = typeof safeEvent.x === 'number' && typeof safeEvent.y === 'number'
        ? ' @ ' + Math.round(safeEvent.x) + ',' + Math.round(safeEvent.y)
        : '';

    return [
        safeEvent.eventType || 'unknown',
        safeEvent.displayName || safeEvent.partType || 'Unknown Part',
        safeEvent.sourceType || 'unknown'
    ].join(' | ') + coordinates;
}

function createSettlementPanel(options) {
    const settings = options || {};
    const document = settings.document;
    let root = null;

    function ensureRoot() {
        if (root) {
            return root;
        }

        root = document.createElement('div');
        root.className = 'settlement-panel is-hidden';
        (document.getElementById('gameAreaWrapper') || document.body).appendChild(root);
        return root;
    }

    function show(summary) {
        const data = summary || {};
        const panel = ensureRoot();
        const bodyParts = Array.isArray(data.bodyParts) ? data.bodyParts : [];
        const keyEvents = Array.isArray(data.keyEvents) ? data.keyEvents : [];

        while (panel.firstChild) {
            panel.removeChild(panel.firstChild);
        }

        panel.appendChild(createText(document, 'div', 'settlement-title', 'Body Sources'));
        panel.appendChild(createText(document, 'div', 'settlement-meta', 'Result: ' + (data.endedReason || 'round_end')));
        if (data.winnerName) {
            panel.appendChild(createText(document, 'div', 'settlement-meta', 'Winner: ' + data.winnerName));
        }
        panel.appendChild(createText(document, 'div', 'settlement-meta', data.historyWritten ? 'This run entered the history library.' : 'This run was not written to history.'));
        if (data.historyWritten) {
            panel.appendChild(createText(document, 'div', 'settlement-meta', 'You may become a future historical echo.'));
        } else if (data.recordingConsent === false) {
            panel.appendChild(createText(document, 'div', 'settlement-meta', 'Recording was declined before this run.'));
        }
        if (data.petClosingLine) {
            panel.appendChild(createText(document, 'div', 'settlement-pet-line', data.petClosingLine));
        }
        if (keyEvents.length) {
            panel.appendChild(createText(document, 'div', 'settlement-subtitle', 'Key Events'));
            keyEvents.forEach((event) => {
                panel.appendChild(createText(document, 'div', 'settlement-event', formatKeyEventLine(event)));
            });
        }

        if (!bodyParts.length) {
            panel.appendChild(createText(document, 'div', 'settlement-empty', 'No body parts recorded.'));
        } else {
            bodyParts.forEach((part) => {
                panel.appendChild(createText(document, 'div', 'settlement-part', formatPartLine(part)));
            });
        }

        panel.classList.remove('is-hidden');
    }

    return {
        show: show,
        formatKeyEventLine: formatKeyEventLine,
        formatPartLine: formatPartLine
    };
}

module.exports = createSettlementPanel;
module.exports.formatKeyEventLine = formatKeyEventLine;
module.exports.formatPartLine = formatPartLine;
