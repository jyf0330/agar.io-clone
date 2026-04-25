/*jshint expr:true */

'use strict';

const expect = require('chai').expect;
const checklist = require('../../tools/testing/ai-checklist-automation');

describe('AI checklist automation map', () => {
  it('should map the high-risk checklist items to executable commands', () => {
    const requiredIds = [
      'A01-01',
      'A01-02',
      'A05-01',
      'A05-04',
      'A07-03',
      'A07-07',
      'A09-05',
      'A10-03',
      'A11-01',
      'A11-03',
      'A12-04',
      'A12-06',
      'A13-02'
    ];
    const missing = checklist.findMissingAutomation(requiredIds);

    expect(missing).to.deep.equal([]);
    requiredIds.forEach((id) => {
      expect(checklist.AUTOMATION_BY_CHECKLIST_ID[id].command).to.be.a('string').and.not.equal('');
    });
  });
});
