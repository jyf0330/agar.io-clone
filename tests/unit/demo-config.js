/*jshint expr:true */

const expect = require('chai').expect;
const path = require('path');

function loadConfigWithEnv(env) {
  const configPath = path.resolve(__dirname, '../../configs/game/config.js');
  const original = {
    V5_DEMO_MODE: process.env.V5_DEMO_MODE,
    V5_NPC_ENABLED: process.env.V5_NPC_ENABLED,
    V3_NPC_ENABLED: process.env.V3_NPC_ENABLED,
    V5_GHOST_ENABLED: process.env.V5_GHOST_ENABLED,
    V5_PET_ENABLED: process.env.V5_PET_ENABLED
  };
  delete require.cache[configPath];
  delete process.env.V5_DEMO_MODE;
  delete process.env.V5_NPC_ENABLED;
  delete process.env.V3_NPC_ENABLED;
  delete process.env.V5_GHOST_ENABLED;
  delete process.env.V5_PET_ENABLED;
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
  it('should use the standard balance preset when V5_DEMO_MODE is off', () => {
    const config = loadConfigWithDemoFlag(null);

    expect(config.demo.enabled).to.equal(false);
    expect(config.demo.roundDurationMs).to.equal(720000);
    expect(config.npc.enabled).to.equal(false);
    expect(config.ghostEcho.enabled).to.equal(false);
    expect(config.pet.enabled).to.equal(false);
    expect(config.balancePreset).to.equal('standard');
    expect(config.partLoot.maxWorldParts).to.equal(10);
    expect(config.ghostEcho.triggerRadius).to.equal(1000);
  });

  it('should make historical echo demo parameters easier to trigger', () => {
    const config = loadConfigWithDemoFlag('1');

    expect(config.demo.enabled).to.equal(true);
    expect(config.demo.roundDurationMs).to.equal(480000);
    expect(config.partLoot.maxWorldParts).to.equal(14);
    expect(config.partLoot.spawnBatch).to.equal(3);
    expect(config.ghostEcho.timeWindowMs).to.equal(60000);
    expect(config.ghostEcho.triggerRadius).to.equal(1200);
    expect(config.ghostEcho.anchorCooldownMs).to.equal(15000);
    expect(config.ghostEcho.debug).to.equal(true);
  });

  it('should include heart loot so natural body completion is reachable', () => {
    const config = loadConfigWithDemoFlag(null);
    const types = config.partLoot.templates.map((template) => template.type);

    expect(types).to.include('HEART');
  });

  it('should keep v5 side modules opt-in for the first playable version', () => {
    expect(loadConfigWithEnv({V5_NPC_ENABLED: '0'}).npc.enabled).to.equal(false);
    expect(loadConfigWithEnv({V5_NPC_ENABLED: '1'}).npc.enabled).to.equal(true);
    expect(loadConfigWithEnv({V3_NPC_ENABLED: '1'}).npc.enabled).to.equal(false);
    expect(loadConfigWithEnv({V5_NPC_ENABLED: '0', V3_NPC_ENABLED: '1'}).npc.enabled).to.equal(false);
    expect(loadConfigWithEnv({V5_GHOST_ENABLED: '1'}).ghostEcho.enabled).to.equal(true);
    expect(loadConfigWithEnv({V5_PET_ENABLED: '1'}).pet.enabled).to.equal(true);
  });
});
