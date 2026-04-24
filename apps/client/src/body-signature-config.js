'use strict';

module.exports = {
    enabled: true,
    storageKey: 'agar.bodySignature',
    canvasSize: 280,
    missingPart: 'HAND',
    bodyBaseImage: 'img/body-signature/body-base-missing-right-arm.png',
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
            image: 'img/body-signature/refs/right-arm-open.png',
            swatch: '#f5a86f'
        },
        {
            id: 'hand-grab',
            part: 'HAND',
            labelKey: 'signature.ref.handGrab',
            hintKey: 'signature.ref.handGrabHint',
            image: 'img/body-signature/refs/right-arm-grab.png',
            swatch: '#c986ff'
        },
        {
            id: 'hand-thread',
            part: 'HAND',
            labelKey: 'signature.ref.handThread',
            hintKey: 'signature.ref.handThreadHint',
            image: 'img/body-signature/refs/right-arm-thread.png',
            swatch: '#59c7e8'
        }
    ]
};
