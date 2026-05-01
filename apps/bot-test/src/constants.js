'use strict';

const BOT_STATES = {
    NotStarted: 'NotStarted',
    Connecting: 'Connecting',
    Connected: 'Connected',
    EnteringLobby: 'EnteringLobby',
    RequestingStart: 'RequestingStart',
    SelectingBodyPart: 'SelectingBodyPart',
    ConfirmingBody: 'ConfirmingBody',
    WaitingForPlayers: 'WaitingForPlayers',
    Countdown: 'Countdown',
    InBattle: 'InBattle',
    Settling: 'Settling',
    Finished: 'Finished',
    Failed: 'Failed',
    Crashed: 'Crashed',
    Timeout: 'Timeout'
};

const FAILURE_REASONS = {
    ConnectionFailed: '连接失败',
    JoinRoomFailed: '进房失败',
    BodySelectionFailed: '身体选择失败',
    BodyConfirmFailed: '确认身体失败',
    CountdownNotStarted: '倒计时没有开始',
    BattleNotStarted: '战斗没有开始',
    BattleDisconnected: '战斗中断线',
    PositionSyncAbnormal: '位置同步异常',
    ResourceSpawnAbnormal: '资源生成异常',
    EndConditionNotTriggered: '结束条件未触发',
    SettlementFailed: '结算失败',
    ClientCrashed: '客户端崩溃',
    ServerError: '服务器异常',
    Timeout: '超时',
    Unknown: '未知异常'
};

const DEFAULT_TIMEOUTS_MS = {
    Connecting: 10000,
    Connected: 5000,
    EnteringLobby: 5000,
    RequestingStart: 5000,
    SelectingBodyPart: 5000,
    ConfirmingBody: 10000,
    WaitingForPlayers: 30000,
    Countdown: 15000,
    InBattle: 330000,
    Settling: 20000
};

const BODY_PART_CHOICES = [
    {
        label: '藤蔓手',
        partType: 'hand_left',
        partId: 'hand_left_option_01'
    },
    {
        label: '木勺手',
        partType: 'hand_left',
        partId: 'hand_left_option_02'
    },
    {
        label: '小盾手',
        partType: 'hand_left',
        partId: 'hand_left_option_03'
    }
];

module.exports = {
    BOT_STATES,
    FAILURE_REASONS,
    DEFAULT_TIMEOUTS_MS,
    BODY_PART_CHOICES
};
