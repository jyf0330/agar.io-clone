'use strict';

var config = require('./body-signature-config');
var analysis = require('./body-signature-analysis');
var storage = require('./body-signature-storage');

function createBodySignatureController(options) {
    var document = options.document;
    var i18n = options.i18n;
    var panelEl = options.panelEl;
    var canvas = options.canvasEl;
    var bodyImageEl = options.bodyImageEl;
    var refsEl = options.refsEl;
    var clearButton = options.clearButton;
    var submitButton = options.submitButton;
    var skipButton = options.skipButton;
    var messageEl = options.messageEl;
    var context = canvas ? canvas.getContext('2d') : null;
    var onComplete = null;
    var drawing = false;
    var hasInk = false;
    var lastPoint = null;

    function setMessage(key, params) {
        if (messageEl) {
            messageEl.textContent = i18n.t(key, params || {});
        }
    }

    function resetCanvas() {
        if (!context) {
            return;
        }
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#21130f';
        context.lineWidth = 9;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        hasInk = false;
        setMessage('signature.message.ready');
    }

    function getPoint(event) {
        var rect = canvas.getBoundingClientRect();
        var source = event.touches && event.touches.length ? event.touches[0] : event;

        return {
            x: (source.clientX - rect.left) * (canvas.width / rect.width),
            y: (source.clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function beginStroke(event) {
        if (!context) {
            return;
        }
        event.preventDefault();
        drawing = true;
        lastPoint = getPoint(event);
    }

    function moveStroke(event) {
        var point;

        if (!drawing || !context) {
            return;
        }
        event.preventDefault();
        point = getPoint(event);
        context.beginPath();
        context.moveTo(lastPoint.x, lastPoint.y);
        context.lineTo(point.x, point.y);
        context.stroke();
        lastPoint = point;
        hasInk = true;
    }

    function endStroke(event) {
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        drawing = false;
        lastPoint = null;
    }

    function renderReferenceCards() {
        refsEl.innerHTML = '';
        config.references.forEach(function (reference) {
            var card = document.createElement('div');
            var preview = document.createElement('img');
            var swatch = document.createElement('span');
            var title = document.createElement('strong');
            var hint = document.createElement('small');

            card.className = 'body-signature-ref';
            preview.className = 'body-signature-ref-image';
            preview.src = reference.image;
            preview.alt = '';
            swatch.className = 'body-signature-ref-swatch';
            swatch.style.backgroundColor = reference.swatch;
            title.textContent = i18n.t(reference.labelKey);
            hint.textContent = i18n.t(reference.hintKey);
            card.appendChild(preview);
            card.appendChild(swatch);
            card.appendChild(title);
            card.appendChild(hint);
            refsEl.appendChild(card);
        });
    }

    function close() {
        if (panelEl) {
            panelEl.className = panelEl.className.replace(/\s?open/g, '');
        }
    }

    function finish(payload) {
        var savedPayload = storage.saveBodySignature(payload);
        close();
        if (onComplete) {
            onComplete(savedPayload);
        }
    }

    function submit() {
        var result = analysis.analyzeCanvas(canvas, config.references, config.tiers);
        var tierLabel = i18n.t(config.tiers[result.tier].labelKey);

        if (!hasInk) {
            setMessage('signature.message.empty');
            return;
        }

        setMessage('signature.message.saved', {
            tier: tierLabel
        });
        finish({
            type: 'body-signature',
            missingPart: config.missingPart,
            selectedReferenceId: result.referenceId,
            tier: result.tier,
            tierLabel: tierLabel,
            bonus: result.bonus,
            similarity: Math.round(result.similarity * 100) / 100,
            coverage: Math.round(result.coverage * 100) / 100,
            imageDataUrl: canvas.toDataURL('image/png'),
            skipped: false
        });
    }

    function skip() {
        finish({
            type: 'body-signature',
            missingPart: config.missingPart,
            selectedReferenceId: config.references[0].id,
            tier: 'none',
            tierLabel: i18n.t(config.tiers.none.labelKey),
            bonus: config.tiers.none.bonus,
            similarity: 0,
            coverage: 0,
            imageDataUrl: null,
            skipped: true
        });
    }

    function open(type, done) {
        onComplete = done;
        if (bodyImageEl) {
            bodyImageEl.src = config.bodyBaseImage;
        }
        renderReferenceCards();
        resetCanvas();
        if (panelEl.className.indexOf('open') === -1) {
            panelEl.className += ' open';
        }
        setMessage(type === 'spectator' ? 'signature.message.spectator' : 'signature.message.ready');
    }

    if (canvas) {
        canvas.width = config.canvasSize;
        canvas.height = config.canvasSize;
        canvas.addEventListener('mousedown', beginStroke);
        canvas.addEventListener('mousemove', moveStroke);
        canvas.addEventListener('mouseup', endStroke);
        canvas.addEventListener('mouseleave', endStroke);
        canvas.addEventListener('touchstart', beginStroke, {passive: false});
        canvas.addEventListener('touchmove', moveStroke, {passive: false});
        canvas.addEventListener('touchend', endStroke, {passive: false});
    }

    if (clearButton) {
        clearButton.onclick = resetCanvas;
    }
    if (submitButton) {
        submitButton.onclick = submit;
    }
    if (skipButton) {
        skipButton.onclick = skip;
    }

    return {
        open: open,
        close: close,
        resetCanvas: resetCanvas,
        shouldOpen: function (type) {
            return config.enabled && type === 'player' && !storage.loadBodySignature();
        }
    };
}

module.exports = createBodySignatureController;
