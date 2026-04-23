/*jshint expr:true */

const expect = require('chai').expect;

const {createPaintedAvatarDataUrl, decodePaintedAvatarSvg} = require('../../apps/server/src/npc/avatar-paint');

describe('npc avatar paint', () => {
    it('should create an svg data url with a translucent diagonal paint stroke', () => {
        const previewDataUrl = createPaintedAvatarDataUrl('data:image/png;base64,AAAA', '#FF6B9D', 2);
        const svg = decodePaintedAvatarSvg(previewDataUrl);

        expect(previewDataUrl.indexOf('data:image/svg+xml;base64,')).to.equal(0);
        expect(svg).to.contain('stroke="#FF6B9D"');
        expect(svg).to.contain('stroke-opacity="0.3"');
        expect(svg).to.contain('line');
    });
});
