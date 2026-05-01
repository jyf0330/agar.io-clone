/*jshint expr:true */

const expect = require('chai').expect;
const path = require('path');

function loadConfigWithEnv(env) {
  const configPath = path.resolve(__dirname, '../../configs/game/config.js');
  const original = {
    V5_BALANCE_PRESET: process.env.V5_BALANCE_PRESET,
    V5_DEMO_MODE: process.env.V5_DEMO_MODE
  };
  delete require.cache[configPath];
  delete process.env.V5_BALANCE_PRESET;
  delete process.env.V5_DEMO_MODE;
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

describe('balance presets', () => {
  it('should default to the standard balance preset', () => {
    const config = loadConfigWithEnv({});

    expect(config.balancePreset).to.equal('standard');
    expect(config.demo.roundDurationMs).to.equal(12 * 60 * 1000);
    expect(config.partLoot.maxWorldParts).to.equal(10);
    expect(config.ghostEcho.triggerRadius).to.equal(1000);
  });

  it('should keep the fast historical echo demo preset explicit', () => {
    const config = loadConfigWithEnv({V5_BALANCE_PRESET: 'demo'});

    expect(config.balancePreset).to.equal('demo');
    expect(config.demo.enabled).to.equal(true);
    expect(config.demo.roundDurationMs).to.equal(8 * 60 * 1000);
    expect(config.partLoot.maxWorldParts).to.equal(14);
    expect(config.partLoot.spawnBatch).to.equal(3);
    expect(config.ghostEcho.triggerRadius).to.equal(1200);
  });

  it('should expose a long form preset for 30-60 minute historical echo sessions', () => {
    const config = loadConfigWithEnv({V5_BALANCE_PRESET: 'long'});

    expect(config.balancePreset).to.equal('long');
    expect(config.demo.roundDurationMs).to.equal(45 * 60 * 1000);
    expect(config.partLoot.maxWorldParts).to.equal(18);
    expect(config.ghostEcho.timeWindowMs).to.equal(90000);
  });
});
