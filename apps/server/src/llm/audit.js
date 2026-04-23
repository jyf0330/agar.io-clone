'use strict';

const fs = require('fs');
const path = require('path');

function resolveAuditDir() {
    return process.env.LLM_AUDIT_DIR || path.resolve(process.cwd(), 'data/audit');
}

function toDateStamp(value) {
    return new Date(value).toISOString().slice(0, 10);
}

function getAuditFilePath(timestamp) {
    return path.join(resolveAuditDir(), toDateStamp(timestamp || Date.now()) + '.jsonl');
}

function append(entry) {
    const ts = entry && entry.ts ? entry.ts : Date.now();
    const auditDir = resolveAuditDir();
    const filePath = getAuditFilePath(ts);
    fs.mkdirSync(auditDir, { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf8');
    return filePath;
}

module.exports = {
    append: append,
    getAuditFilePath: getAuditFilePath,
    resolveAuditDir: resolveAuditDir
};
