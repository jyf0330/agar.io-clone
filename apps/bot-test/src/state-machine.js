'use strict';

const {
    BOT_STATES,
    FAILURE_REASONS,
    DEFAULT_TIMEOUTS_MS
} = require('./constants');

class BotStateMachine {
    constructor(options) {
        const settings = options || {};
        this.botId = settings.botId;
        this.state = BOT_STATES.NotStarted;
        this.stateStartedAt = settings.now ? settings.now() : Date.now();
        this.now = settings.now || Date.now;
        this.logger = settings.logger || null;
        this.timeouts = Object.assign({}, DEFAULT_TIMEOUTS_MS, settings.timeouts || {});
        this.lastSuccessEvent = null;
        this.failure = null;
    }

    transition(nextState, type, message, data) {
        const now = this.now();
        this.state = nextState;
        this.stateStartedAt = now;
        const event = {
            botId: this.botId,
            state: nextState,
            type: type || '状态变更',
            message: message || nextState,
            data: Object.assign({
                elapsedInStageMs: 0
            }, data || {})
        };

        if (this.logger && typeof this.logger.bot === 'function') {
            this.logger.bot(event);
        }

        if (nextState !== BOT_STATES.Failed && nextState !== BOT_STATES.Crashed && nextState !== BOT_STATES.Timeout) {
            this.lastSuccessEvent = event;
        }

        return event;
    }

    fail(reason, stage, message, data) {
        const failureStage = stage || this.state;
        this.failure = {
            stage: failureStage,
            reason: reason || FAILURE_REASONS.Unknown,
            possibleCause: message || reason || FAILURE_REASONS.Unknown,
            data: data || null,
            stack: data && data.stack ? data.stack : ''
        };
        this.state = reason === FAILURE_REASONS.Timeout ? BOT_STATES.Timeout : BOT_STATES.Failed;
        if (this.logger && typeof this.logger.bot === 'function') {
            this.logger.bot({
                botId: this.botId,
                state: this.state,
                type: reason === FAILURE_REASONS.Timeout ? '超时' : '异常',
                message: message || reason || FAILURE_REASONS.Unknown,
                level: 'error',
                data: Object.assign({
                    failedStage: failureStage,
                    reason: this.failure.reason
                }, data || {})
            });
        }
        return this.failure;
    }

    crash(error, stage) {
        const stack = error && error.stack ? error.stack : '';
        this.failure = {
            stage: stage || this.state,
            reason: FAILURE_REASONS.ClientCrashed,
            possibleCause: error && error.message ? error.message : FAILURE_REASONS.ClientCrashed,
            stack: stack
        };
        this.state = BOT_STATES.Crashed;
        if (this.logger && typeof this.logger.error === 'function') {
            this.logger.error({
                botId: this.botId,
                state: this.state,
                type: '客户端崩溃',
                message: this.failure.possibleCause,
                data: {
                    failedStage: this.failure.stage,
                    stack: stack
                }
            });
        }
        return this.failure;
    }

    checkTimeout() {
        if (this.state === BOT_STATES.Failed || this.state === BOT_STATES.Crashed || this.state === BOT_STATES.Timeout || this.state === BOT_STATES.Finished) {
            return false;
        }

        const timeoutMs = this.timeouts[this.state];
        if (!timeoutMs) {
            return false;
        }

        const elapsedMs = this.now() - this.stateStartedAt;
        if (elapsedMs <= timeoutMs) {
            return false;
        }

        this.fail(
            FAILURE_REASONS.Timeout,
            this.state,
            '阶段超时：' + this.state + '，已等待 ' + elapsedMs + 'ms',
            {
                elapsedMs,
                timeoutMs
            }
        );
        return true;
    }

    toResult() {
        return {
            botId: this.botId,
            state: this.state,
            failure: this.failure,
            lastSuccessEvent: this.lastSuccessEvent
        };
    }
}

module.exports = {
    BOT_STATES,
    FAILURE_REASONS,
    DEFAULT_TIMEOUTS_MS,
    BotStateMachine
};
