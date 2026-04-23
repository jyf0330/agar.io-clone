'use strict';

function createSpeechBubble(options) {
    const document = options.document;
    let layer = null;
    let bubbles = [];

    function ensureLayer() {
        if (layer) {
            return layer;
        }

        layer = document.createElement('div');
        layer.className = 'npc-speech-layer';
        (document.getElementById('gameAreaWrapper') || document.body).appendChild(layer);
        return layer;
    }

    function prune() {
        const now = Date.now();
        bubbles = bubbles.filter((bubble) => {
            if (bubble.expiresAt > now) {
                return true;
            }

            if (bubble.node && bubble.node.parentNode) {
                bubble.node.parentNode.removeChild(bubble.node);
            }
            return false;
        });
    }

    function show(npcId, text, duration) {
        const node = document.createElement('div');
        const bubble = {
            id: npcId + ':' + Date.now() + ':' + Math.random().toString(16).slice(2),
            npcId: npcId,
            text: text,
            createdAt: Date.now(),
            expiresAt: Date.now() + (duration || 3000),
            node: node
        };

        node.className = 'npc-speech-bubble';
        node.textContent = text;
        node.style.left = '50%';
        node.style.top = '20%';
        ensureLayer().appendChild(node);
        bubbles.push(bubble);
    }

    function render(users, player, screen) {
        const root = ensureLayer();
        prune();

        if (!player || !Array.isArray(users) || !screen) {
            return;
        }

        const grouped = {};
        bubbles.forEach((bubble) => {
            if (!grouped[bubble.npcId]) {
                grouped[bubble.npcId] = [];
            }
            grouped[bubble.npcId].push(bubble);
        });

        Object.keys(grouped).forEach((npcId) => {
            const user = users.find((entry) => entry.npcId === npcId || entry.id === npcId);
            grouped[npcId].slice(-3).forEach((bubble, index) => {
                const remaining = Math.max(0, bubble.expiresAt - Date.now());
                const node = bubble.node;
                if (!node) {
                    return;
                }

                if (user && user.cells && user.cells.length) {
                    const cell = user.cells[0];
                    node.style.left = (cell.x - player.x + screen.width / 2) + 'px';
                    node.style.top = (cell.y - player.y + screen.height / 2 - cell.radius - 44 - index * 36) + 'px';
                }
                node.style.opacity = remaining < 350 ? (remaining / 350).toFixed(2) : '1';
                if (!node.parentNode) {
                    root.appendChild(node);
                }
            });
        });
    }

    return {
        show: show,
        render: render
    };
}

module.exports = createSpeechBubble;
