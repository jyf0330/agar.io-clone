'use strict';

const {expect} = require('chai');
const id = require('../../apps/server/src/lib/id');

describe('id.js', function () {
    it('should create uuid-shaped random ids without the uuid package', function () {
        const first = id.createId();
        const second = id.createId();

        expect(first).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(second).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(first).to.not.equal(second);
    });
});
