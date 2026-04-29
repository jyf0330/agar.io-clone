/*jshint expr:true */

const expect = require('chai').expect;
const fs = require('fs');
const os = require('os');
const path = require('path');
const {loadPersonalityCard} = require('../../apps/server/src/npc/personality-loader');

function writeTempCard(contents) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agario-card-'));
    const filePath = path.join(dir, 'card.yaml');
    fs.writeFileSync(filePath, contents, 'utf8');
    return {dir, filePath};
}

describe('personality-loader.js', () => {
    it('should load a complete card, preserve raw anchors, and embed the skeleton preview', () => {
        const {dir, filePath} = writeTempCard([
            'id: test-pet',
            'name: Test Pet',
            'skeleton: skeleton-a-doll',
            'color: "#ffcc00"',
            'archetype: curious',
            'anchors:',
            '  facts:',
            '    - "remembers exact places"',
            '  catchphrases:',
            '    - "stay close"',
            '  taboos:',
            '    - "do not invent gifts"',
            'behavior:',
            '  talkativeness: 1',
            'relationship_schema:',
            '  trust: 0'
        ].join('\n'));

        const card = loadPersonalityCard(filePath);

        expect(card.id).to.equal('test-pet');
        expect(card.filePath).to.equal(filePath);
        expect(card.anchorsText).to.contain('facts:');
        expect(card.anchorsText).to.contain('do not invent gifts');
        expect(card.previewDataUrl).to.match(/^data:image\/png;base64,/);

        fs.rmSync(dir, {recursive: true, force: true});
    });

    it('should fail fast when a required card field is missing', () => {
        const {dir, filePath} = writeTempCard([
            'id: broken',
            'name: Broken',
            'skeleton: skeleton-a-doll'
        ].join('\n'));

        expect(() => loadPersonalityCard(filePath))
            .to.throw('missing color, archetype, anchors, behavior, relationship_schema');

        fs.rmSync(dir, {recursive: true, force: true});
    });
});
