'use strict';

const DEFAULT_EXCLUDES = [
  '.git/',
  'node_modules/',
  'data/',
  '.env',
  '.env.local',
  '.launcher/',
  '.playwright-cli/',
  'graphify-out/',
  '.DS_Store'
];

const DEFAULT_TARGET = 'ubuntu@124.222.83.113:/home/ubuntu/apps/agar-io-clone/';

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function buildRsyncCommand(options) {
  const settings = options || {};
  const keyPath = settings.keyPath || '<path-to-agar.pem>';
  const source = settings.source || './';
  const target = settings.target || DEFAULT_TARGET;
  const excludes = settings.excludes || DEFAULT_EXCLUDES;
  const args = ['rsync', '-az'];

  if (settings.dryRun) {
    args.push('--dry-run');
  }
  args.push('--delete');
  args.push('-e', shellQuote('ssh -i ' + keyPath + ' -o StrictHostKeyChecking=accept-new'));
  excludes.forEach((pattern) => {
    args.push('--exclude', shellQuote(pattern));
  });
  args.push(source, target);

  return args.join(' ');
}

function printPlan() {
  const command = buildRsyncCommand({
    keyPath: process.env.AGAR_SSH_KEY || '<path-to-agar.pem>',
    dryRun: process.argv.indexOf('--dry-run') !== -1
  });

  console.log(command);
}

if (require.main === module) {
  printPlan();
}

module.exports = {
  DEFAULT_EXCLUDES,
  DEFAULT_TARGET,
  buildRsyncCommand
};
