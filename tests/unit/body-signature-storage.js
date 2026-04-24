/*jshint expr:true */

const expect = require('chai').expect;
const storage = require('../../apps/client/src/body-signature-storage');

describe('body-signature-storage.js', () => {
  function createMemoryStorage() {
    const values = {};
    return {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
      },
      setItem(key, value) {
        values[key] = String(value);
      },
      removeItem(key) {
        delete values[key];
      }
    };
  }

  it('should save and load a signature payload', () => {
    const memoryStorage = createMemoryStorage();

    storage.saveBodySignature({
      tier: 'faint',
      selectedReferenceId: 'hand-open'
    }, memoryStorage);

    expect(storage.loadBodySignature(memoryStorage)).to.include({
      tier: 'faint',
      selectedReferenceId: 'hand-open'
    });
  });

  it('should clear a saved signature payload', () => {
    const memoryStorage = createMemoryStorage();

    storage.saveBodySignature({tier: 'echo'}, memoryStorage);
    storage.clearBodySignature(memoryStorage);

    expect(storage.loadBodySignature(memoryStorage)).to.equal(null);
  });
});
