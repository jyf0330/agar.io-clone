/*jshint expr:true */

const expect = require('chai').expect;
const i18n = require('../../apps/client/src/i18n');

describe('i18n.js', () => {
  function createMemoryStorage() {
    const values = {};
    return {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
      },
      setItem(key, value) {
        values[key] = String(value);
      }
    };
  }

  it('should default to chinese translations', () => {
    i18n.setLocale('zh-CN');
    expect(i18n.t('startMenu.play')).to.equal('开始游戏');
  });

  it('should switch to english and persist the locale', () => {
    const storage = createMemoryStorage();
    i18n.setLocale('en', storage);

    expect(i18n.t('startMenu.play')).to.equal('Play');
    expect(storage.getItem('agar.locale')).to.equal('en');
  });
});
