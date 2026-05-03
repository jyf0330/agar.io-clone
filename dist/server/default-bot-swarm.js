'use strict';

const path = require('path');
const DEFAULT_BOT_COUNT = 3;
const DEFAULT_SERVER_HOST = '127.0.0.1';
const MAX_BOT_COUNT = 12;
const QUIET_BOT_LOGGER = {
  log() {},
  warn() {}
};
function parsePositiveInteger(value, fallback) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, MAX_BOT_COUNT);
}
function buildLocalServerUrl(serverPort) {
  return 'http://' + DEFAULT_SERVER_HOST + ':' + (serverPort || 3000);
}
function resolveDefaultBotSwarmOptions(inputEnv, serverPort) {
  const env = inputEnv || process.env;
  return {
    enabled: env.V5_DEFAULT_BOTS === '0' ? false : true,
    count: parsePositiveInteger(env.V5_DEFAULT_BOT_COUNT, DEFAULT_BOT_COUNT),
    serverUrl: env.V5_DEFAULT_BOT_SERVER_URL || buildLocalServerUrl(serverPort)
  };
}
function loadStartBotSwarm() {
  return require(path.resolve(process.cwd(), 'apps/bot-client/src/bot-swarm')).startBotSwarm;
}
function startDefaultBotSwarm(options) {
  const settings = options || {};
  const logger = settings.logger || console;
  const botOptions = resolveDefaultBotSwarmOptions(settings.env, settings.serverPort);
  const botLogger = settings.botLogger || QUIET_BOT_LOGGER;
  if (!botOptions.enabled) {
    if (logger && typeof logger.log === 'function') {
      logger.log('[BOT] default socket bots disabled');
    }
    return [];
  }
  const startBotSwarm = settings.startBotSwarm || loadStartBotSwarm();
  try {
    return startBotSwarm({
      serverUrl: botOptions.serverUrl,
      count: botOptions.count,
      profileNames: settings.profileNames,
      logger: botLogger
    });
  } catch (error) {
    if (logger && typeof logger.warn === 'function') {
      logger.warn('[BOT] failed to start default socket bots: ' + error.message);
    }
    return [];
  }
}
module.exports = {
  DEFAULT_BOT_COUNT,
  resolveDefaultBotSwarmOptions,
  startDefaultBotSwarm
};