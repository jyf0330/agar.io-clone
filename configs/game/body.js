module.exports = {
    defaultLoadout: ['HEAD', 'HAND', 'FOOT', 'MOUTH', 'HEART'],
    abilityModifiers: {
        resonanceIntimacyPerExtraHeart: 1,
        breakSpikePerExtraSpike: 1,
        playerDevourMassBonusPerExtraMouth: 0.25,
        movementSpeedMultiplierPerExtraFoot: 0.1,
        connectionRangePerExtraHand: 40,
        visionRangePerExtraHead: 120
    },
    signatureBonuses: {
        HAND: {
            none: {
                connectionRangeBonus: 0
            },
            faint: {
                connectionRangeBonus: 10
            },
            echo: {
                connectionRangeBonus: 15
            }
        }
    },
    partDefinitions: {
        HEAD: {
            label: 'Head',
            mount: 'HEAD',
            isCore: true
        },
        HAND: {
            label: 'Hand',
            mount: 'ARM',
            isCore: true
        },
        FOOT: {
            label: 'Foot',
            mount: 'LEG',
            isCore: true
        },
        MOUTH: {
            label: 'Mouth',
            mount: 'TORSO',
            isCore: true
        },
        HEART: {
            label: 'Heart',
            mount: 'CORE',
            isCore: true
        },
        SPIKE: {
            label: 'Spike',
            mount: 'EXTERNAL',
            isCore: false
        }
    }
};
