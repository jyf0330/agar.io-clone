module.exports = {
    defaultMaterialization: 0,
    valuePerBodyPart: 15,
    stageThresholds: {
        HOLLOW: {
            min: 0,
            max: 24
        },
        PARTIAL: {
            min: 25,
            max: 54
        },
        REAL: {
            min: 55,
            max: 89
        },
        OVERREAL: {
            min: 90
        }
    }
};
