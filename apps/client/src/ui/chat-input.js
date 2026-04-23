'use strict';

function createChatInput(options) {
    const settings = options || {};
    const document = settings.document;
    let root = null;
    let historyList = null;
    let input = null;
    let sendHandler = null;
    let localMessages = [];

    function ensureRoot() {
        let wrapper;
        let history;
        let historyLabel;
        let composer;

        if (root) {
            return root;
        }

        root = document.createElement('div');
        root.className = 'npc-chat-input is-hidden';

        history = document.createElement('div');
        history.className = 'npc-chat-history';

        historyLabel = document.createElement('div');
        historyLabel.className = 'npc-chat-history-label';
        historyLabel.textContent = 'Recent';
        history.appendChild(historyLabel);

        historyList = document.createElement('div');
        historyList.className = 'npc-chat-history-list';
        history.appendChild(historyList);

        composer = document.createElement('div');
        composer.className = 'npc-chat-composer';

        input = document.createElement('input');
        input.className = 'npc-chat-field';
        input.type = 'text';
        input.maxLength = 160;
        input.autocomplete = 'off';
        input.placeholder = 'Say something to the NPCs...';
        input.setAttribute('aria-label', 'Chat with nearby NPCs');
        input.addEventListener('keydown', handleKeyDown);

        composer.appendChild(input);
        root.appendChild(history);
        root.appendChild(composer);

        wrapper = document.getElementById('gameAreaWrapper') || document.body;
        wrapper.appendChild(root);
        renderHistory();
        return root;
    }

    function renderHistory() {
        const list = ensureRoot() && historyList;

        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }

        if (!localMessages.length) {
            const emptyState = document.createElement('span');
            emptyState.className = 'npc-chat-history-item is-empty';
            emptyState.textContent = 'Your last 5 messages will appear here.';
            list.appendChild(emptyState);
            return;
        }

        localMessages.forEach((message) => {
            const item = document.createElement('span');
            item.className = 'npc-chat-history-item';
            item.textContent = message;
            list.appendChild(item);
        });
    }

    function addLocalMessage(message) {
        const text = (message || '').trim();
        if (!text) {
            return;
        }

        localMessages.push(text);
        if (localMessages.length > 5) {
            localMessages = localMessages.slice(-5);
        }
        renderHistory();
    }

    function submitCurrentValue() {
        let shouldStore = true;
        const text = input ? input.value.trim() : '';
        if (!text) {
            return;
        }

        if (typeof sendHandler === 'function') {
            shouldStore = sendHandler(text) !== false;
        }
        if (!shouldStore) {
            return;
        }

        addLocalMessage(text);
        input.value = '';
    }

    function handleKeyDown(event) {
        if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
            return;
        }

        event.preventDefault();
        submitCurrentValue();
    }

    function show() {
        ensureRoot();
        root.classList.remove('is-hidden');
        if (input) {
            input.disabled = false;
        }
    }

    function hide() {
        ensureRoot();
        root.classList.add('is-hidden');
        if (input) {
            input.blur();
        }
    }

    function focus() {
        ensureRoot();
        if (root.classList.contains('is-hidden')) {
            root.classList.remove('is-hidden');
        }
        if (input) {
            input.focus();
        }
    }

    function setSendHandler(handler) {
        sendHandler = handler;
    }

    function getLocalMessages() {
        return localMessages.slice();
    }

    return {
        show: show,
        hide: hide,
        focus: focus,
        setSendHandler: setSendHandler,
        addLocalMessage: addLocalMessage,
        getLocalMessages: getLocalMessages
    };
}

module.exports = createChatInput;
