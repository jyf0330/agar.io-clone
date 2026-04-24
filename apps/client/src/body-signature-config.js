'use strict';

module.exports = {
    enabled: true,
    storageKey: 'agar.bodySignature',
    canvasSize: 280,
    missingPart: 'HAND',
    tiers: {
        none: {
            minSimilarity: 0,
            labelKey: 'signature.tier.none',
            bonus: 'none'
        },
        faint: {
            minSimilarity: 0.10,
            labelKey: 'signature.tier.faint',
            bonus: 'slot-unlocked'
        },
        echo: {
            minSimilarity: 0.70,
            labelKey: 'signature.tier.echo',
            bonus: 'high-resonance'
        }
    },
    references: [
        {
            id: 'hand-open',
            part: 'HAND',
            labelKey: 'signature.ref.handOpen',
            hintKey: 'signature.ref.handOpenHint',
            swatch: '#f5a86f'
        },
        {
            id: 'hand-grab',
            part: 'HAND',
            labelKey: 'signature.ref.handGrab',
            hintKey: 'signature.ref.handGrabHint',
            swatch: '#c986ff'
        },
        {
            id: 'hand-thread',
            part: 'HAND',
            labelKey: 'signature.ref.handThread',
            hintKey: 'signature.ref.handThreadHint',
            swatch: '#59c7e8'
        }
    ]
};
