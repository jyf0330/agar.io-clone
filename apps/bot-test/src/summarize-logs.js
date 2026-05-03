'use strict';

const fs = require('fs');
const path = require('path');

const {
    buildBotLogSummary,
    formatBotLogSummaryMarkdown
} = require('./log-summary');

function parseArgs(argv) {
    const args = Array.isArray(argv) ? argv : process.argv.slice(2);
    const options = {
        logDir: path.resolve(process.cwd(), 'logs/bot-test'),
        limit: 10,
        session: '',
        output: ''
    };
    for (let index = 0; index < args.length; index += 1) {
        const arg = args[index];
        if (arg === '--logDir') {
            options.logDir = args[index + 1];
            index += 1;
        } else if (arg === '--limit') {
            options.limit = Math.max(1, Number(args[index + 1]) || options.limit);
            index += 1;
        } else if (arg === '--session') {
            options.session = args[index + 1] || '';
            index += 1;
        } else if (arg === '--output') {
            options.output = args[index + 1] || '';
            index += 1;
        }
    }
    return options;
}

function main() {
    const options = parseArgs();
    const markdown = formatBotLogSummaryMarkdown(buildBotLogSummary(options));
    if (options.output) {
        const outputPath = path.resolve(process.cwd(), options.output);
        fs.mkdirSync(path.dirname(outputPath), {recursive: true});
        fs.writeFileSync(outputPath, markdown + '\n');
        console.log(outputPath);
        return;
    }
    console.log(markdown);
}

if (require.main === module) {
    main();
}

module.exports = {
    parseArgs
};
