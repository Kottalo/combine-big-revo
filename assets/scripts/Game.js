var EnergyBar = require("EnergyBar");

const Fruit = cc.Class({
    name: 'FruitItem',
    properties: {
        id: 0,
        iconSF: cc.SpriteFrame
    }
});

const JuiceItem = cc.Class({
    name: 'JuiceItem',
    properties: {
        particle: cc.SpriteFrame,
        circle: cc.SpriteFrame,
        slash: cc.SpriteFrame,
    }
});

const Skill = cc.Class({
    name: 'Skill',
    properties: {
        name: cc.String,
        energy: cc.Integer,
        func: cc.String,
    }
});

cc.Class({
    extends: cc.Component,

    properties: {
        skills: {
            default: [],
            type: Skill,
        },

        skillButtonGap: {
            default: 50,
            type: cc.Integer,
        },

        skillButtonOffset: {
            default: null,
            type: cc.v2,
        },

        skillButtonPrefab: {
            default: null,
            type: cc.Prefab,
        },

        fruits: {
            default: [],
            type: Fruit
        },

        juices: {
            default: [],
            type: JuiceItem
        },

        // 动态生成 找到批量处理预置元素的方案
        fruitPrefab: {
            default: null,
            type: cc.Prefab
        },

        container: {
            default: null,
            type: cc.Node
        },

        juicePrefab: {
            default: null,
            type: cc.Prefab
        },

        // todo 可以实现一个audioManager
        boomAudio: {
            default: null,
            type: cc.AudioClip
        },
        knockAudio: {
            default: null,
            type: cc.AudioClip
        },
        waterAudio: {
            default: null,
            type: cc.AudioClip
        },
        scoreLabel: {
            default: null,
            type: cc.Label
        },
        energyBar: {
            default: null,
            type: EnergyBar,
        }
    },

    onLoad() {
        this.initPhysics()

        this.isCreating = false
        this.fruitCount = 0
        this.score = 0
        this.useFinger = false

        // 监听点击事件 todo 是否能够注册全局事件
        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this)

        this.initOneFruit()

    },
    start() {
        
        // 生成技能按钮
        this.skills.forEach((skill) => {
            var skillButton = cc.instantiate(this.skillButtonPrefab);

            var skillBtn = skillButton.getComponent(cc.Button);
            
            skillButton.children[0].children[0].getComponent(cc.Label).string = skill.name+` (${skill.energy})`;

            skillBtn.node.on(cc.Node.EventType.TOUCH_START, function(event) {
                if (this.energyBar.energyPoint >=  skill.energy)
                {
                    this.energyBar.consumeEnergy(skill.energy);

                    eval(`this.${skill.func}()`);
                }
            }, this);

            skillButton.parent = this.node;
            skillButton.position = this.skillButtonOffset;

            this.skillButtonOffset = new cc.v2(this.skillButtonOffset.x, this.skillButtonOffset.y - this.skillButtonGap);
        });
    },

    // 开启物理引擎和碰撞检测
    initPhysics() {
        // 物理引擎
        const instance = cc.director.getPhysicsManager()
        instance.enabled = true
        // instance.debugDrawFlags = 4
        instance.gravity = cc.v2(0, -960);

        // 碰撞检测
        const collisionManager = cc.director.getCollisionManager();
        collisionManager.enabled = true

        // 设置四周的碰撞区域
        let width = this.node.width;
        let height = this.node.height;

        let node = new cc.Node();

        // 整个容器
        this.container = node;
        
        let body = node.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Kinematic;

        body.allowSleep = false;
        

        const _addBound = (node, x, y, width, height) => {
            let collider = node.addComponent(cc.PhysicsBoxCollider);
            collider.offset.x = x;
            collider.offset.y = y;
            collider.size.width = width;
            collider.size.height = height;
        }

        _addBound(node, 0, -height / 2, width, 1);
        _addBound(node, 0, height / 2, width, 1);
        _addBound(node, -width / 2, 0, 1, height);
        _addBound(node, width / 2, 0, 1, height);

        node.parent = this.node;
    },

    initOneFruit(id = 1) {
        this.fruitCount++
        this.currentFruit = this.createFruitOnPos(0, 400, id)
    },

    // 监听屏幕点击
    onTouchStart(e) {
        if (this.isCreating) return
        this.isCreating = true
        const {width, height} = this.node


        const fruit = this.currentFruit

        const pos = e.getLocation()
        let {x, y} = pos
        x = x - width / 2
        y = y - height / 2

        const action = cc.sequence(cc.moveBy(0.1, cc.v2(x, 0)).easing(cc.easeCubicActionIn()), cc.callFunc(() => {
            // 开启物理效果
            this.startFruitPhysics(fruit)

            // 1s后重新生成一个
            this.scheduleOnce(() => {
                const nextId = this.getNextFruitId()
                this.initOneFruit(nextId)
                this.isCreating = false
            }, 1)
        }))

        fruit.runAction(action)
    },
    onFingerTouch() {
        console.log('onFingerTouch')
        this.useFinger = true
    },
    // 获取下一个水果的id
    getNextFruitId() {
        if (this.fruitCount < 3) {
            return 1
        } else if (this.fruitCount === 3) {
            return 2
        } else {
            // 随机返回前5个
            return Math.floor(Math.random() * 5) + 1
        }
    },
    // 创建一个水果
    createOneFruit(num) {
        let fruit = cc.instantiate(this.fruitPrefab);
        const config = this.fruits[num - 1]

        fruit.getComponent('Fruit').init({
            id: config.id,
            iconSF: config.iconSF
        });

        fruit.getComponent(cc.RigidBody).type = cc.RigidBodyType.Static
        fruit.getComponent(cc.PhysicsCircleCollider).radius = 0

        this.node.addChild(fruit);
        fruit.scale = 0.6

        // 有Fruit组件传入
        fruit.on('sameContact', this.onSameFruitContact.bind(this))
        fruit.on(cc.Node.EventType.TOUCH_START, (e) => {
            // 选择道具时直接消除对应水果
            if (this.useFinger && fruit !== this.currentFruit) {
                const {x, y, width} = fruit
                this.createFruitJuice(config.id, cc.v2({x, y}), width)
                e.stopPropagation()
                this.useFinger = false
                fruit.removeFromParent(true)

            }
        })

        return fruit
    },

    startFruitPhysics(fruit) {
        fruit.getComponent(cc.RigidBody).type = cc.RigidBodyType.Dynamic
        const physicsCircleCollider = fruit.getComponent(cc.PhysicsCircleCollider)
        physicsCircleCollider.radius = fruit.height / 2
        physicsCircleCollider.apply()
    },

    // 在指定位置生成水果
    createFruitOnPos(x, y, type = 1) {
        const fruit = this.createOneFruit(type)
        fruit.setPosition(cc.v2(x, y));
        return fruit
    },
    // 两个水果碰撞
    onSameFruitContact({self, other}) {
        other.node.off('sameContact') // 两个node都会触发，todo 看看有没有其他方法只展示一次的

        const id = other.getComponent('Fruit').id

        // 最大无效
        if (id == 11)
            return;

        
        var vanishNode;
        var stayNode;

        if (self.node.position.y > other.node.position.y)
        {
            vanishNode = self.node;
            stayNode = other.node;
        }
        else
        {
            vanishNode = other.node;
            stayNode = self.node;
        }

        vanishNode.getComponent(cc.PhysicsCircleCollider).enabled = false;

        cc.tween(vanishNode)
            .to(0.2, {position: stayNode.position} )
            .call(() => {
                // todo 可以使用对象池回收
                vanishNode.removeFromParent(true)
                stayNode.removeFromParent(true)

                const {x, y} = stayNode

                this.createFruitJuice(id, cc.v2({x, y}), stayNode.width)

                this.addScore(id)

                this.energyBar.gainEnergy(id);

                const nextId = id + 1
                if (nextId <= 11) {
                    const newFruit = this.createFruitOnPos(x, y, nextId)

                    this.startFruitPhysics(newFruit)

                    // 展示动画 todo 动画效果需要调整
                    newFruit.scale = 0
                    cc.tween(newFruit).to(.5, {
                        scale: 0.6
                    }, {
                        easing: "backOut"
                    }).start()
                } else {
                    // todo 合成两个西瓜
                    console.log(' todo 合成两个西瓜 还没有实现哦~ ')
                }
            })
        .start();

        
    },

    // 合并时的动画效果
    createFruitJuice(id, pos, n) {
        // 播放合并的声音
        cc.audioEngine.play(this.boomAudio, false, 1);
        cc.audioEngine.play(this.waterAudio, false, 1);

        // 展示动画
        let juice = cc.instantiate(this.juicePrefab);
        this.node.addChild(juice);

        const config = this.juices[id - 1]
        const instance = juice.getComponent('Juice')
        instance.init(config)
        instance.showJuice(pos, n)
    },
    // 添加得分分数
    addScore(fruitId) {
        this.score += fruitId * 2
        // todo 处理分数tween动画
        this.scoreLabel.string = this.score
    },

    // ---技能---

    // 摇一摇
    shake()
    {
        var force = 100;
        var position = this.container.position;
        cc.tween(this.container)
            .to(0.05, { rotation: 5 })
            .to(0.05, { rotation: -5 })
            .to(0.05, { rotation: 5 })
            .to(0.05, { rotation: -5 })
            .to(0.05, { rotation: 0 })
            .start()
    },

    // 消除
    erase()
    {
        console.log("erase");
    }
});
