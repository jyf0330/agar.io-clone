/*jshint expr:true */

const expect = require('chai').expect;
const path = require('path');

function loadConfigWithDemoFlag(value) {
  const configPath = path.resolve(__dirname, '../../configs/game/config.js');
  delete require.cache[configPath];
  if (value === null) {
    delete process.env.V5_DEMO_MODE;
  } else {
    process.env.V5_DEMO_MODE = value;
  }
  const config = require(configPath);
  delete require.cache[configPath];
  delete process.env.V5_DEMO_MODE;
  return config;
}

describe('demo config', () => {
  it('should leave normal mode unchanged when V5_DEMO_MODE is off', () => {
    const config = loadConfigWithDemoFlag(null);

    expect(config.demo.enabled).to.equal(false);
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
});
