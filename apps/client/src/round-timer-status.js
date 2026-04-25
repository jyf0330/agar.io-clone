'use strict';

function padTwoDigits(value) {
    return value < 10 ? '0' + value : String(value);
}

function formatRemainingTime(remainingMs) {
    const totalSeconds = Math.max(0, Math.ceil((remainingMs || 0) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return padTwoDigits(minutes) + ':' + padTwoDigits(seconds);
}

function formatRoundTimerStatus(roundTimer, i18n) {
    if (!roundTimer || typeof roundTimer.remainingMs !== 'number' || !i18n) {
        return '';
    }

    return '<br /><span class="round-timer">'
        + i18n.t('hud.roundTimer', {time: formatRemainingTime(roundTimer.remainingMs)})
        + '</span>';
}

module.exports = formatRoundTimerStatus;
module.exports.formatRemainingTime = formatRemainingTime;
