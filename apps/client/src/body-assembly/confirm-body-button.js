'use strict';

function createConfirmBodyButton(options) {
    var button = options.button;
    var onConfirm = options.onConfirm;

    button.addEventListener('click', function (event) {
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        onConfirm();
    });

    function render(state) {
        button.disabled = !state.selectedOption || !!state.confirmed;
        button.textContent = state.confirmed ? '身体已确认' : '确认身体';
    }

    return {
        render: render
    };
}

module.exports = createConfirmBodyButton;
