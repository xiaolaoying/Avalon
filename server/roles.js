// 预定义的身份和相关信息
var e = {
    MEILIN: 0,
    PAIXI: 1,
    ZHONGCHEN: 2,
    MOGANNA: 3,
    HEILAODA: 4,
    ZHAOYA: 5,
    AOBOLUN: 6,
    CIKE: 7
}, a = {
    0: {
        name: "梅林",
        canSee: [ e.MOGANNA, e.CIKE, e.ZHAOYA, e.AOBOLUN ],
        canSeeDesc: "你能看到的坏人分别是",
        goodTeam: !0
    },
    1: {
        name: "派西维尔",
        canSee: [ e.MEILIN, e.MOGANNA ],
        canSeeDesc: "以下两人中一人是梅林，一人是莫甘娜",
        goodTeam: !0
    },
    2: {
        name: "忠臣",
        canSee: [],
        canSeeDesc: "",
        goodTeam: !0
    },
    3: {
        name: "莫甘娜",
        canSee: [ e.CIKE, e.HEILAODA, e.ZHAOYA ],
        canSeeDesc: "你能看到的其他坏人阵营是",
        goodTeam: !1
    },
    4: {
        name: "莫德雷德",
        canSee: [ e.MOGANNA, e.CIKE, e.ZHAOYA ],
        canSeeDesc: "你能看到的其他坏人阵营是",
        goodTeam: !1
    },
    5: {
        name: "爪牙",
        canSee: [ e.MOGANNA, e.CIKE, e.HEILAODA ],
        canSeeDesc: "你能看到的其他坏人阵营是",
        goodTeam: !1
    },
    6: {
        name: "奥伯伦",
        canSee: [],
        canSeeDesc: "",
        goodTeam: !1
    },
    7: {
        name: "刺客",
        canSee: [ e.MOGANNA, e.ZHAOYA, e.HEILAODA ],
        canSeeDesc: "你能看到的其他坏人阵营是",
        goodTeam: !1
    }
};

module.exports = {
    roles: e,
    roleDefs: a
};