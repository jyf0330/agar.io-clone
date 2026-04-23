/*jshint expr:true */

const expect = require('chai').expect;
const config = require('../../configs/game/config');
const virusUtils = require('../../apps/server/src/map/virus');

describe('virus.js', () => {
  it('should remove multiple virus indexes in one call', () => {
    const manager = new virusUtils.VirusManager(config.virus);
    manager.addNew(3);

    const initialIds = manager.data.map((virus) => virus.id);

    manager.delete([0, 2]);

    expect(manager.data).to.have.lengthOf(1);
    expect(manager.data[0].id).to.equal(initialIds[1]);
  });
});
