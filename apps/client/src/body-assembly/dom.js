'use strict';

function clearElement(element) {
    if (!element) {
        return;
    }
    if (typeof element.replaceChildren === 'function') {
        element.replaceChildren();
        return;
    }
    element.innerHTML = '';
    if (Array.isArray(element.children)) {
        element.children = [];
    }
}

function addClass(element, className) {
    if (!element) {
        return;
    }
    if (element.classList && typeof element.classList.add === 'function') {
        element.classList.add(className);
        return;
    }
    if (element.className.indexOf(className) === -1) {
        element.className = (element.className + ' ' + className).trim();
    }
}

function removeClass(element, className) {
    if (!element) {
        return;
    }
    if (element.classList && typeof element.classList.remove === 'function') {
        element.classList.remove(className);
        return;
    }
    element.className = element.className
        .split(/\s+/)
        .filter(function (entry) {
            return entry && entry !== className;
        })
        .join(' ');
}

function toggleClass(element, className, force) {
    if (force) {
        addClass(element, className);
    } else {
        removeClass(element, className);
    }
}

function createImageWithFallback(document, part, fallbackText) {
    var shell = document.createElement('div');
    var image = document.createElement('img');
    var fallback = document.createElement('span');

    shell.className = 'body-assembly-image-shell';
    image.className = 'body-assembly-part-image';
    image.src = part.image;
    image.alt = part.name || part.id || fallbackText;
    shell.title = part.description || part.name || part.id || fallbackText;
    image.onerror = function () {
        addClass(shell, 'is-placeholder');
        image.style.display = 'none';
    };
    fallback.className = 'body-assembly-part-placeholder';
    fallback.textContent = fallbackText;

    shell.appendChild(image);
    shell.appendChild(fallback);
    return shell;
}

module.exports = {
    addClass: addClass,
    clearElement: clearElement,
    createImageWithFallback: createImageWithFallback,
    removeClass: removeClass,
    toggleClass: toggleClass
};
