'use strict';

var PART_TYPES = [
    'head',
    'body',
    'hand_left',
    'hand_right',
    'leg_left',
    'leg_right'
];

var PART_LABELS = {
    head: '头',
    body: '身体',
    hand_left: '左手',
    hand_right: '右手',
    leg_left: '左腿',
    leg_right: '右腿'
};

var BASE_PART = {
    id: 'body_base_01',
    name: '身体基底',
    image: 'img/body-assembly/base/body_base_01.png',
    description: '羊皮纸祭坛上的圆形基底，用来承托临时拼装出的神体轮廓。'
};

var FIXED_PART_DESCRIPTIONS = {
    head: '固定头：怪诞但可爱的默认头部，黑色粗线条和低饱和色块，先保证拼接位置清楚。',
    body: '固定身体：中心躯干带有头、手、腿接口，是所有零件拼接的基准。',
    hand_left: '固定左手：向左外展的小怪手，右侧接口对准身体。',
    hand_right: '固定右手：向右外展的小怪手，左侧接口对准身体。',
    leg_left: '固定左腿：从身体下方伸出的左腿，脚部朝下，便于看清缺口。',
    leg_right: '固定右腿：从身体下方伸出的右腿，脚部朝下，便于看清缺口。'
};

var OPTION_DESCRIPTIONS = {
    head_option_01: '怪笑表情，像刚被召唤出来的小怪物，适合偏狡黠的开局形象。',
    head_option_02: '旧木偶质感，木纹和圆眼突出，适合偏神秘、傀儡感的角色。',
    head_option_03: '暖色灯笼轮廓，脸部发光但不恐怖，适合夜行和祝福主题。',
    body_option_01: '苔纹躯壳，绿色苔痕覆盖躯干，给角色一种从森林祭坛诞生的感觉。',
    body_option_02: '圆肚躯壳，米黄色大肚子更亲和，适合可爱笨重的第一版视觉。',
    body_option_03: '铃骨躯壳，赭色骨纹和小铃铛强调仪式感，但保持轻怪诞不血腥。',
    hand_left_option_01: '藤蔓左手，像植物缠绕成的手臂，抓取感弱但生命力强。',
    hand_left_option_02: '木勺左手，生活化道具感强，荒诞又好懂。',
    hand_left_option_03: '小盾左手，轮廓更硬朗，适合防御或守护定位。',
    hand_right_option_01: '羽枝右手，羽毛和树枝结合，动作轻，适合敏捷或感知定位。',
    hand_right_option_02: '铃杖右手，像祭司拿着小铃杖，适合仪式、召唤和引导。',
    hand_right_option_03: '贝壳右手，海边遗物感，适合水系或收藏癖角色。',
    leg_left_option_01: '蘑菇左腿，短粗可爱，像从潮湿地面长出的脚。',
    leg_left_option_02: '木桩左腿，稳定、笨重，适合耐力型身体拼法。',
    leg_left_option_03: '弯月左腿，月牙形剪影更奇幻，适合轻盈跳跃感。',
    leg_right_option_01: '叶靴右腿，绿色叶片包住脚，像森林旅者的靴子。',
    leg_right_option_02: '石靴右腿，灰色石块脚，强调重量和平衡。',
    leg_right_option_03: '烛台右腿，暖色烛台脚，像边走边点亮祭坛。'
};

function describePart(partType, id) {
    return OPTION_DESCRIPTIONS[id] || FIXED_PART_DESCRIPTIONS[partType] || '';
}

var FIXED_PARTS = {
    head: {
        id: 'head_fixed_01',
        name: '固定头',
        image: 'img/body-assembly/fixed/head_fixed_01.png'
    },
    body: {
        id: 'body_fixed_01',
        name: '固定身体',
        image: 'img/body-assembly/fixed/body_fixed_01.png'
    },
    hand_left: {
        id: 'hand_left_fixed_01',
        name: '固定左手',
        image: 'img/body-assembly/fixed/hand_left_fixed_01.png'
    },
    hand_right: {
        id: 'hand_right_fixed_01',
        name: '固定右手',
        image: 'img/body-assembly/fixed/hand_right_fixed_01.png'
    },
    leg_left: {
        id: 'leg_left_fixed_01',
        name: '固定左腿',
        image: 'img/body-assembly/fixed/leg_left_fixed_01.png'
    },
    leg_right: {
        id: 'leg_right_fixed_01',
        name: '固定右腿',
        image: 'img/body-assembly/fixed/leg_right_fixed_01.png'
    }
};

var OPTION_PARTS = {
    head: [
        {
            id: 'head_option_01',
            name: '怪笑头',
            image: 'img/body-assembly/options/head/head_option_01.png',
            stats: { vision: 10 }
        },
        {
            id: 'head_option_02',
            name: '木偶头',
            image: 'img/body-assembly/options/head/head_option_02.png',
            stats: { vision: 15 }
        },
        {
            id: 'head_option_03',
            name: '灯笼头',
            image: 'img/body-assembly/options/head/head_option_03.png',
            stats: { vision: 20 }
        }
    ],
    body: [
        {
            id: 'body_option_01',
            name: '苔纹躯壳',
            image: 'img/body-assembly/options/body/body_option_01.png',
            stats: { endurance: 10 }
        },
        {
            id: 'body_option_02',
            name: '圆肚躯壳',
            image: 'img/body-assembly/options/body/body_option_02.png',
            stats: { endurance: 15 }
        },
        {
            id: 'body_option_03',
            name: '铃骨躯壳',
            image: 'img/body-assembly/options/body/body_option_03.png',
            stats: { endurance: 20 }
        }
    ],
    hand_left: [
        {
            id: 'hand_left_option_01',
            name: '藤蔓左手',
            image: 'img/body-assembly/options/hand_left/hand_left_option_01.png',
            stats: { grasp: 10 }
        },
        {
            id: 'hand_left_option_02',
            name: '木勺左手',
            image: 'img/body-assembly/options/hand_left/hand_left_option_02.png',
            stats: { grasp: 15 }
        },
        {
            id: 'hand_left_option_03',
            name: '小盾左手',
            image: 'img/body-assembly/options/hand_left/hand_left_option_03.png',
            stats: { grasp: 20 }
        }
    ],
    hand_right: [
        {
            id: 'hand_right_option_01',
            name: '羽枝右手',
            image: 'img/body-assembly/options/hand_right/hand_right_option_01.png',
            stats: { reach: 10 }
        },
        {
            id: 'hand_right_option_02',
            name: '铃杖右手',
            image: 'img/body-assembly/options/hand_right/hand_right_option_02.png',
            stats: { reach: 15 }
        },
        {
            id: 'hand_right_option_03',
            name: '贝壳右手',
            image: 'img/body-assembly/options/hand_right/hand_right_option_03.png',
            stats: { reach: 20 }
        }
    ],
    leg_left: [
        {
            id: 'leg_left_option_01',
            name: '蘑菇左腿',
            image: 'img/body-assembly/options/leg_left/leg_left_option_01.png',
            stats: { stability: 10 }
        },
        {
            id: 'leg_left_option_02',
            name: '木桩左腿',
            image: 'img/body-assembly/options/leg_left/leg_left_option_02.png',
            stats: { stability: 15 }
        },
        {
            id: 'leg_left_option_03',
            name: '弯月左腿',
            image: 'img/body-assembly/options/leg_left/leg_left_option_03.png',
            stats: { stability: 20 }
        }
    ],
    leg_right: [
        {
            id: 'leg_right_option_01',
            name: '叶靴右腿',
            image: 'img/body-assembly/options/leg_right/leg_right_option_01.png',
            stats: { balance: 10 }
        },
        {
            id: 'leg_right_option_02',
            name: '石靴右腿',
            image: 'img/body-assembly/options/leg_right/leg_right_option_02.png',
            stats: { balance: 15 }
        },
        {
            id: 'leg_right_option_03',
            name: '烛台右腿',
            image: 'img/body-assembly/options/leg_right/leg_right_option_03.png',
            stats: { balance: 20 }
        }
    ]
};

PART_TYPES.forEach(function (partType) {
    if (FIXED_PARTS[partType]) {
        FIXED_PARTS[partType].description = describePart(partType, FIXED_PARTS[partType].id);
    }
    (OPTION_PARTS[partType] || []).forEach(function (part) {
        part.description = describePart(partType, part.id);
    });
});

var PART_ANCHORS = {
    head: { x: 512, y: 210, zIndex: 30 },
    body: { x: 512, y: 430, zIndex: 10 },
    hand_left: { x: 330, y: 430, zIndex: 20 },
    hand_right: { x: 690, y: 430, zIndex: 20 },
    leg_left: { x: 430, y: 670, zIndex: 5 },
    leg_right: { x: 590, y: 670, zIndex: 5 }
};

function clonePart(part) {
    return Object.assign({}, part, {
        stats: part && part.stats ? Object.assign({}, part.stats) : undefined
    });
}

function createBodyAssemblyConfig(options) {
    var missingPartType = options.missingPartType;
    var selectedOption = options.selectedOption;
    var layers = {
        base: clonePart(BASE_PART)
    };

    PART_TYPES.forEach(function (partType) {
        layers[partType] = clonePart(partType === missingPartType ? selectedOption : FIXED_PARTS[partType]);
    });

    return {
        missingPartType: missingPartType,
        selectedOption: clonePart(selectedOption),
        fixedParts: FIXED_PARTS,
        layers: layers,
        anchors: PART_ANCHORS
    };
}

module.exports = {
    PART_TYPES: PART_TYPES,
    PART_LABELS: PART_LABELS,
    BASE_PART: BASE_PART,
    FIXED_PARTS: FIXED_PARTS,
    OPTION_PARTS: OPTION_PARTS,
    PART_ANCHORS: PART_ANCHORS,
    createBodyAssemblyConfig: createBodyAssemblyConfig
};
