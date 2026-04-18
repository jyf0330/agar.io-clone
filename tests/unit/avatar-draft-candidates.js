/*jshint expr:true */

const expect = require('chai').expect;
const candidates = require('../../apps/client/src/avatar-draft-candidates');

describe('avatar-draft-candidates.js', () => {
  var config = {
    candidateCount: 4,
    enableHistoryPool: true,
    defaultMissingPartsPool: ['hair', 'eye']
  };

  var defaultTemplates = [
    {
      id: 'template-a',
      previewMeta: { title: 'A', subtitle: 'A-sub' },
      fullShapeData: {
        version: '6.7.1',
        objects: [
          { partType: 'hair', id: 'hair-a' },
          { partType: 'eye', id: 'eye-a' },
          { partType: 'base', id: 'base-a' }
        ]
      }
    },
    {
      id: 'template-b',
      previewMeta: { title: 'B', subtitle: 'B-sub' },
      fullShapeData: {
        version: '6.7.1',
        objects: [
          { partType: 'hair', id: 'hair-b' },
          { partType: 'eye', id: 'eye-b' },
          { partType: 'base', id: 'base-b' }
        ]
      }
    }
  ];

  it('should build the requested number of candidates and remove the missing part', () => {
    var result = candidates.buildDraftCandidates({
      config: config,
      defaultTemplates: defaultTemplates,
      historyEntries: [],
      randomIndex: function () { return 0; }
    });

    expect(result).to.have.length(4);
    expect(result[0].missingPartType).to.equal('hair');
    expect(result[0].baseShapeData.objects.some((object) => object.partType === 'hair')).to.equal(false);
  });

  it('should mix in history candidates when history is available', () => {
    var result = candidates.buildDraftCandidates({
      config: config,
      defaultTemplates: defaultTemplates,
      historyEntries: [
        {
          templateId: 'template-a',
          missingPartType: 'eye',
          previewDataUrl: 'data:image/png;base64,history'
        }
      ],
      randomIndex: function () { return 0; }
    });

    expect(result[1].sourceType).to.equal('history');
    expect(result[1].previewMeta.previewDataUrl).to.equal('data:image/png;base64,history');
    expect(result[1].baseShapeData.objects.some((object) => object.partType === 'eye')).to.equal(false);
  });
});
