/*jshint expr:true */

const expect = require('chai').expect;
const {pickGreetingFallback} = require('../../apps/server/src/npc/greetings');
const forbiddenWords = require('../../demo/critiques/pool.json').meta.forbiddenWords;

describe('npc greetings', () => {
    it('should pick a short mochi fallback line that avoids forbidden words', () => {
        const text = pickGreetingFallback('mochi', {
            timeOfDay: '下午'
        });

        expect(text.length).to.be.at.least(1);
        expect(text.length).to.be.at.most(15);
        forbiddenWords.forEach((badWord) => {
            expect(text.includes(badWord)).to.equal(false);
        });
    });
});
