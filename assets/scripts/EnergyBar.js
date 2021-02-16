// Learn cc.Class:
//  - https://docs.cocos.com/creator/manual/en/scripting/class.html
// Learn Attribute:
//  - https://docs.cocos.com/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - https://docs.cocos.com/creator/manual/en/scripting/life-cycle-callbacks.html

cc.Class({
    extends: cc.Component,

    properties: {
        energyPoint: {
            get: function () {
                return this._energyPoint;
            },

            set: function(value) {
                this._energyPoint = value;
                this.updateEnergyBar();
            },
            
            type: cc.Integer, // optional, default is typeof default
        },
        energyMax: {
            // ATTRIBUTES:
            default: 50,        // The default value will be used only when the component attaching
                                  // to a node for the first time
            type: cc.Integer, // optional, default is typeof default
            serializable: false,   // optional, default is true
        },
    },

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {},

    start () {
        this.energyPoint = 0;
    },

    // 取得能量
    gainEnergy(point)
    {
        var capacity = this.energyMax - this.energyPoint;

        this.energyPoint += Math.min(point, capacity);
    },

    // 消耗能量
    consumeEnergy(point)
    {
        this.energyPoint -= point;
    },

    // 刷新能量条
    updateEnergyBar()
    {
        var energyBar = this.node.getComponent(cc.ProgressBar);

        var energyRatio = this.energyPoint / this.energyMax;

        energyBar.progress = energyRatio;

        this.updateLabel();
    },

    // 刷新能量点
    updateLabel()
    {
        this.node.getChildByName("EnergyPoint").getComponent(cc.Label).string = this.energyPoint + "/" + this.energyMax;
    }
});
