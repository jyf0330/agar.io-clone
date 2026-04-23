'use strict';

function createPaintToast(options) {
    const document = options.document;
    const window = options.window;
    let layer = null;

    function ensureLayer() {
        if (layer) {
            return layer;
        }

        layer = document.createElement('div');
        layer.className = 'npc-paint-toast-layer';
        (document.getElementById('gameAreaWrapper') || document.body).appendChild(layer);
        return layer;
    }

    function show(message, duration) {
        const root = ensureLayer();
        const toast = document.createElement('div');
        const ttl = duration || 2000;

        toast.className = 'npc-paint-toast';
        toast.textContent = message;
        root.appendChild(toast);

        window.setTimeout(function () {
            toast.className += ' is-fading';
        }, Math.max(0, ttl - 220));
        window.setTimeout(function () {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, ttl);
    }

    return {
        show: show
    };
}

module.exports = createPaintToast;
