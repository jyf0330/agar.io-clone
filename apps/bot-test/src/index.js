'use strict';

const {parseBotTestArgs} = require('./config');
const {runBotTest} = require('./runner');

async function main() {
    const config = parseBotTestArgs(process.argv.slice(2));
    const result = await runBotTest(config);
    console.log('[BotTest] 日志目录：' + result.sessionDir);
    console.log('[BotTest] 结算完成：' + (result.completedSettlement ? '是' : '否'));
    process.exit(result.completedSettlement ? 0 : 1);
}

if (require.main === module) {
    main().catch((error) => {
        console.error('[BotTest] 运行失败：' + (error && error.stack ? error.stack : error));
        process.exit(1);
    });
}

module.exports = {
    main
};
