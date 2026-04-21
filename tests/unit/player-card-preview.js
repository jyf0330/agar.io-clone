/*jshint expr:true */

const expect = require('chai').expect;
const i18n = require('../../apps/client/src/i18n');
const formatPlayerCardPreview = require('../../apps/client/src/player-card-preview');

describe('player-card-preview.js', () => {
  beforeEach(() => {
    i18n.setLocale('zh-CN');
  });

  it('should render a saved player card image', () => {
    const markup = formatPlayerCardPreview('data:image/png;base64,abc', 'My Card');

    expect(markup).to.contain('My Card');
    expect(markup).to.contain('<img');
    expect(markup).to.contain('data:image/png;base64,abc');
  });

  it('should render an empty state when there is no saved card', () => {
    const markup = formatPlayerCardPreview(null, 'My Card');

    expect(markup).to.contain('My Card');
    expect(markup).to.contain('还没有名片');
  });
});
