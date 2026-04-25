/*jshint expr:true */

const expect = require('chai').expect;
const path = require('path');

function loadConfigWithEnv(env) {
  const configPath = path.resolve(__dirname, '../../configs/game/config.js');
  const original = {
    V5_DEMO_MODE: process.env.V5_DEMO_MODE,
    V5_NPC_ENABLED: process.env.V5_NPC_ENABLED,
    V3_NPC_ENABLED: process.env.V3_NPC_ENABLED
  };
  delete require.cache[configPath];
  delete process.env.V5_DEMO_MODE;
  delete process.env.V5_NPC_ENABLED;
  delete process.env.V3_NPC_ENABLED;
  Object.keys(env || {}).forEach((key) => {
    process.env[key] = env[key];
  });
  const config = require(configPath);
  delete require.cache[configPath];
  Object.keys(original).forEach((key) => {
    if (original[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original[key];
    }
  });
  return config;
}

function loadConfigWithDemoFlag(value) {
  return loadConfigWithEnv(value === null ? {} : {V5_DEMO_MODE: value});
}

describe('demo config', () => {
  it('should leave normal mode unchanged when V5_DEMO_MODE is off', () => {
    const config = loadConfigWithDemoFlag(null);

    expect(config.demo.enabled).to.equal(false);
    expect(config.npc.enabled).to.equal(true);
    expect(config.partLoot.maxWorldParts).to.equal(8);
    expect(config.ghostEcho.triggerRadius).to.equal(800);
  });

  it('should make historical echo demo parameters easier to trigger', () => {
    const config = loadConfigWithDemoFlag('1');

    expect(config.demo.enabled).to.equal(true);
    expect(config.demo.roundDurationMs).to.equal(120000);
    expect(config.partLoot.maxWorldParts).to.equal(14);
    expect(config.partLoot.spawnBatch).to.equal(3);
    expect(config.ghostEcho.timeWindowMs).to.equal(60000);
    expect(config.ghostEcho.triggerRadius).to.equal(1200);
    expect(config.ghostEcho.anchorCooldownMs).to.equal(15000);
    expect(config.ghostEcho.debug).to.equal(true);
  });

  it('should allow V5 npc features to be disabled without breaking legacy opt-in', () => {
    expect(loadConfigWithEnv({V5_NPC_ENABLED: '0'}).npc.enabled).to.equal(false);
    expect(loadConfigWithEnv({V5_NPC_ENABLED: '0', V3_NPC_ENABLED: '1'}).npc.enabled).to.equal(true);
  });
});
