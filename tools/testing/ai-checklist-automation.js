'use strict';

const AUTOMATION_BY_CHECKLIST_ID = {
  'A01-01': {
    command: 'npm test',
    covers: 'full unit, integration, and smoke regression suite'
  },
  'A01-02': {
    command: 'npm run build',
    covers: 'build, lint, webpack bundle, and dist refresh'
  },
  'A05-01': {
    command: 'npm run test:integration -- --grep "player handshake"',
    covers: 'connect -> respawn -> welcome -> gotit -> serverTellPlayerMove'
  },
  'A05-04': {
    command: 'npm run test:unit -- --grep "serverTellPlayerMove argument order"',
    covers: 'visible world sync payload shape including part loot and ghosts'
  },
  'A07-03': {
    command: 'npm run test:integration -- --grep "sanitize chat"',
    covers: 'chat sanitization, broadcast, and chat repository persistence'
  },
  'A07-07': {
    command: 'npm run test:integration -- --grep "failed admin login"',
    covers: 'incorrect admin password response and audit persistence'
  },
  'A09-05': {
    command: 'npm run test:unit -- --grep "part lifecycle events"',
    covers: 'pickup, equip, replace, and drop writes through ghostRecorder'
  },
  'A10-03': {
    command: 'npm run test:unit -- --grep "pet_switched"',
    covers: 'active pet switch memory facts'
  },
  'A11-01': {
    command: 'npm run test:unit -- --grep "ghost recorder"',
    covers: 'trace, chat, item, part, combat, and anchor recording'
  },
  'A11-03': {
    command: 'npm run test:integration -- --grep "historical echo persistence"',
    covers: 'persisted session replay into active ghosts'
  },
  'A12-04': {
    command: 'npm run test:integration -- --grep "socket flow"',
    covers: 'socket payload handling through live server'
  },
  'A12-06': {
    command: 'npm run test:unit -- --grep "fail-open"',
    covers: 'memory write failures do not break replay recording callers'
  },
  'A13-02': {
    command: 'npm run test:unit -- --grep "deploy rsync plan"',
    covers: 'cloud sync excludes runtime state and secrets'
  }
};

function findMissingAutomation(checklistIds) {
  return (checklistIds || []).filter((id) => {
    const entry = AUTOMATION_BY_CHECKLIST_ID[id];
    return !entry || !entry.command;
  });
}

function printAutomation() {
  Object.keys(AUTOMATION_BY_CHECKLIST_ID).sort().forEach((id) => {
    const entry = AUTOMATION_BY_CHECKLIST_ID[id];
    console.log(id + '\t' + entry.command + '\t' + entry.covers);
  });
}

if (require.main === module) {
  printAutomation();
}

module.exports = {
  AUTOMATION_BY_CHECKLIST_ID,
  findMissingAutomation
};
