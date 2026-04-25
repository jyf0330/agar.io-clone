'use strict';

function createText(document, tagName, className, text) {
    const node = document.createElement(tagName);
    node.className = className;
    node.textContent = text;
    return node;
}

function formatAttributeValue(value) {
    if (typeof value === 'number') {
        return (value >= 0 ? '+' : '') + value;
    }
    return String(value);
}

function formatAttributes(source) {
    return Object.keys(source || {})
        .filter((key) => source[key] !== null && typeof source[key] !== 'undefined' && source[key] !== 0)
        .map((key) => key + ' ' + formatAttributeValue(source[key]));
}

function formatPartAttributes(part) {
    const safePart = part || {};
    return formatAttributes(safePart.stats).concat(formatAttributes(safePart.signatureBonus));
}

function formatPartTitle(part) {
    const safePart = part || {};
    const type = safePart.partType || safePart.type || 'UNKNOWN';
    const name = safePart.displayName || safePart.label || safePart.templateId || type;
    return name + '（' + type + '）';
}

function renderPart(document, part) {
    const item = document.createElement('div');
    const safePart = part || {};
    const attributes = formatPartAttributes(safePart);

    item.className = 'body-inventory-item';
    item.appendChild(createText(document, 'div', 'body-inventory-item-title', formatPartTitle(safePart)));
    item.appendChild(createText(document, 'div', 'body-inventory-item-meta', '来源：' + (safePart.sourceType || safePart.source || 'unknown')));
    item.appendChild(createText(document, 'div', 'body-inventory-item-meta', '模板：' + (safePart.templateId || safePart.partId || safePart.id || 'default')));
    item.appendChild(createText(document, 'div', 'body-inventory-item-attrs', attributes.length ? attributes.join('，') : '暂无属性'));

    return item;
}

function createFallbackElement(document, id, tagName, className, parent) {
    const element = document.createElement(tagName);
    element.id = id;
    element.className = className || '';
    (parent || document.body).appendChild(element);
    return element;
}

function createBodyInventoryPanel(options) {
    const settings = options || {};
    const document = settings.document;
    const wrapper = document.getElementById('gameAreaWrapper') || document.body;
    const button = document.getElementById('bodyInventoryButton')
        || createFallbackElement(document, 'bodyInventoryButton', 'button', 'body-inventory-button', wrapper);
    const panel = document.getElementById('bodyInventoryPanel')
        || createFallbackElement(document, 'bodyInventoryPanel', 'div', 'body-inventory-panel is-hidden', wrapper);
    const list = document.getElementById('bodyInventoryList')
        || createFallbackElement(document, 'bodyInventoryList', 'div', 'body-inventory-list', panel);
    const closeButton = document.getElementById('bodyInventoryCloseButton')
        || createFallbackElement(document, 'bodyInventoryCloseButton', 'button', 'body-inventory-close', panel);
    let visible = false;
    panel.classList.add('is-hidden');

    function clearList() {
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
    }

    function render() {
        const player = typeof settings.getPlayer === 'function' ? settings.getPlayer() : null;
        const parts = player && Array.isArray(player.bodyParts) ? player.bodyParts : [];

        clearList();
        button.textContent = '部位 ' + parts.length;

        if (!parts.length) {
            list.appendChild(createText(document, 'div', 'body-inventory-empty', '还没有吞到部位。'));
            return;
        }

        parts.forEach((part) => {
            list.appendChild(renderPart(document, part));
        });
    }

    function setVisible(nextVisible) {
        visible = nextVisible;
        if (visible) {
            render();
            panel.classList.remove('is-hidden');
        } else {
            panel.classList.add('is-hidden');
        }
    }

    button.addEventListener('click', function () {
        setVisible(!visible);
    });
    closeButton.addEventListener('click', function () {
        setVisible(false);
    });

    render();

    return {
        update: render,
        show: function () {
            setVisible(true);
        },
        hide: function () {
            setVisible(false);
        },
        formatPartAttributes: formatPartAttributes,
        formatPartTitle: formatPartTitle
    };
}

module.exports = createBodyInventoryPanel;
module.exports.formatPartAttributes = formatPartAttributes;
module.exports.formatPartTitle = formatPartTitle;
