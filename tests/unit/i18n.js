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

  it('should expose labels for the draft management controls', () => {
    i18n.setLocale('zh-CN');
    expect(i18n.t('editor.newImage')).to.equal('新建图片');
    expect(i18n.t('editor.saveDraft')).to.equal('保存到草稿');
    expect(i18n.t('editor.draftHistory')).to.equal('历史草稿');

    i18n.setLocale('en');
    expect(i18n.t('editor.newImage')).to.equal('New Image');
    expect(i18n.t('editor.saveDraft')).to.equal('Save Draft');
    expect(i18n.t('editor.draftHistory')).to.equal('Draft History');
  });

  it('should expose labels for the advanced layer menu', () => {
    i18n.setLocale('zh-CN');
    expect(i18n.t('editor.advancedLayers')).to.equal('高级图层');

    i18n.setLocale('en');
    expect(i18n.t('editor.advancedLayers')).to.equal('Advanced Layers');
  });

  it('should expose labels for the V5 signature drawing panel', () => {
    i18n.setLocale('zh-CN');
    expect(i18n.t('signature.submit')).to.equal('提交签名');
    expect(i18n.t('signature.tier.echo')).to.equal('强回声');

    i18n.setLocale('en');
    expect(i18n.t('signature.submit')).to.equal('Submit Signature');
    expect(i18n.t('signature.tier.echo')).to.equal('Strong echo');
  });
});
