/**
 * 简单的线性动画库，在UI上提供基础的DOM动画能力
 * @project
 * @name Animate
 * @subtitle v1.1
 * @download http://115.29.195.88:86/release/animate-1.1.min.js
 * @uncompressdownload http://115.29.195.88:86/release/animate-1.1.js
 * @support ie,chrome,firefox
 * @demo
 * <div id="aniElem"></div>
 * <style>
 * #aniElem{
 *  background:#f00;
 *  width:100px;
 *  height:100px;
 *  position:absolute;
 * }
 * </style>
 * <script type="application/javascript">
 * var ani = new Animate()
 * .setElement(document.getElementById("aniElem"))
 * .keyframe([{point:0,
 *  left:0,
 *  top:0
 * },{point:500,
 *  left:'100px',
 *  top:'100px'
 *  }]).start();
 * </script>
 * @howto
 * animate使用非常简单，你只需要添加关键帧，然后start就好了
 *
 * **举个例子**
 *
 *      <div id="aniDiv" style="position:absolute">动画实例</div>
 *
 * 你有上面这样一个元素，想做一个曲线运动，那么js可以这么写
 *
 *      var ani = new window.Animate(document.getElementById("aniDiv"));
 *      ani.keyframe({point:0,left:"0",top:"0"})
 *      .keyframe({point:500,left:"100px",top:"100px"})
 *      .keyframe({point:1000,left:"0px",top:"100px"})
 *      .start({timing:"linear"});
 *
 * 用法灰常简单，大家可以尽情享用，下面是个demo
 * @author alandlguo
 * 2013/06/06
 */

(function(exports) {
    //检测浏览器引擎
    var unid = 0;
    var performance = window.performance || {};
    //bind fix
    if (!Function.bind) {
        Function.prototype.bind = function() {
            var __method = this;
            var args = Array.prototype.slice.call(arguments);
            var object = args.shift();

            return function() {
                return __method.apply(object,
                    args.concat(Array.prototype.slice.call(arguments)));
            };
        };
    }

    var createJudgeFunc = function(vendor) {
        return function(){
            var dummyStyle = document.createElement('div').style;
            var v = vendor.prefix.split(','),
                t,
                i = 0,
                l = v.length;

            for (; i < l; i++) {
                t = v[i] + vendor.words;
                if (t in dummyStyle) {
                    return v[i].substr(0, v[i].length - 1);
                }
            }

            return false;
        }
    }
    //前缀
    var prefixStyle = function(style,judgeFunc) {
        var vendor = judgeFunc();
        if (vendor === '') return style;
        style = style.charAt(0).toUpperCase() + style.substr(1);
        return vendor + style;
    }
    var prefixCSS = function(style,judgeFunc) {
        var vendor = judgeFunc();
        if (vendor === '') return style;
        style = style.charAt(0) + style.substr(1);
        return vendor + style;
    }

    //judgeFunc 定义
    var requestAnimationFramejudgeFunc = createJudgeFunc({
        prefix:'r,webkitR,MozR,msR,OR',
        words:'equestAnimationFrame'
    });

    var transformJudgeFunc =  createJudgeFunc({
        prefix:'t,webkitT,MozT,msT,OT',
        words:'ransform'
    });

    var transitionJudgeFunc = createJudgeFunc({
        prefix:'t,webkitT,MozT,msT,OT',
        words:'ransition'
    });

    var animateJudgeFunc = createJudgeFunc({
        prefix:'a,webkitA,MozA,msA,OA',
        words:'nimation'
    });

    var animateCSSJudgeFunc = createJudgeFunc({
        prefix:'a,-webkit-a,-moz-a,-ms-a,-o-a',
        words:'nimation'
    });


    var bindEvt = function(elem, event, handler) {
        if (elem.addEventListener) {
            elem.addEventListener(event, handler, false);
        } else {
            //IE8 older
            elem.attachEvent("on" + event, function() {
                handler.call(elem, window.event)
            });
        }
    }

    var extend = function(obj, ext) {
        for (var p in ext) {
            obj[p] = ext[p];
        }
        return obj;
    }

    var indexOf = function(array, item) {
        if (array.indexOf) return array.indexOf(item);
        else {
            for (var i = 0, p; p = array[i]; i++) {
                if (p === item) return i;
            }
            return -1;
        }
    }

    var requestAnimationFrame = window[prefixStyle("requestAnimationFrame",requestAnimationFramejudgeFunc)] || function(callback) {setTimeout(callback, 17)};

    //全局唯一的style标签
    var cssAnimation = document.createElement('style');
    cssAnimation.setAttribute("id", "ex_animate_style");
    cssAnimation.type = 'text/css';
    document.getElementsByTagName("head")[0].appendChild(cssAnimation);

    /**
     * Animate
     * @class Animate
     * @constructor
     */
    var Animate = function() {
        this._init.apply(this, arguments);
    }

    Animate.prototype = {
        css: document.getElementById("ex_animate_style"),

        /**
         * 系统关键字
         * @private
         */
        _keywords: ["point", "timing"],

        /**
         * 事件
         * @private
         */
        _events: [],

        /**
         * 当前动画使用的方法
         * @private
         */
        _method: null,

        /**
         * 当前帧
         * @private
         */
        _currentFrame: 0,

        /**
         * 用来控制暂停
         * @private
         */
        _needStop: false,

        /**
         * 初始化
         * @private
         */
        _init: function(elem, opts) {
            opts = opts || {};
            this.elem = elem;
            this.options = extend({}, opts);
            this.events = {};
            this.keyframes = [];
            this.keyframesString = [];
            this.uniqId = ++unid;

            //检测兼容性
            //css3 keyframe支持
            //css3 transform支持
            //css3 transition支持
            //requestNextFrame 支持
            //setTimeout
            var dummyStyle = document.createElement("div").style;
            var transform = prefixStyle("transform",transformJudgeFunc);
            var transition = prefixStyle("transition",transitionJudgeFunc);
            var animation = prefixStyle("animation",animateJudgeFunc);
            //if(transform in dummyStyle) this.options.transform = true;
            if (transition in dummyStyle) this.options.transition = true;
            if (animation in dummyStyle) this.options.animation = true;
            //if(window.requestAnimationFrame) this.options.requestAnimationFrame = true;

            //set keyframe element
            if (this.options.animation) {
                var rules = document.createTextNode("");
                this.css.appendChild(rules);
                this.keyframeElement = rules;
            }
        },

        /**
         * 更换动画元素，动画本身不变
         * @method setElement
         * @param {Dom} elem
         * @return {Object} Animate
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         * @example
         * var ani = new Animate();
         * ani.setElement(document.getElementById("aniElem"));
         */
        setElement: function(elem) {
            this.elem = elem;
            return this;
        },


        /**
         * 得到动画相关属性
         * @private
         * @method _getProperty
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         */
        _getProperty: function(frame) {
            var obj = {};
            for (var p in frame) {
                if (indexOf(this._keywords, p) == -1)
                    obj[p] = frame[p];
            }
            return obj;
        },

        /**
         * 设置关键帧
         * @method keyframe
         * @param {Object} frames 关键帧
         * @return {Animate} this 返回当前Animate对象
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         * @changelist 0.1:参数变更
         * @examplerun
         * <div id="aniElem"></div>
         * <style>
         * #aniElem{
         *  background:#f00;
         *  width:100px;
         *  height:100px;
         *  position:absolute;
         * }
         * </style>
         * <script type="application/javascript">
         * var ani = new Animate()
         * .setElement(document.getElementById("aniElem"))
         * .keyframe([{point:0,
         *  left:0,
         *  top:0
         * },{point:500,
         *  left:'100px',
         *  top:'100px'
         *  }]).start();
         * </script>
         */
        keyframe: function(frames) {
            this.keyframes = this.keyframes.concat(frames);
            return this;
        },

        /**
         * 重置动画对象，清空关键帧
         */
        reset: function() {
            this.keyframes = [];
            this.elem.style[prefixStyle("animation",animateJudgeFunc)] = "";
            this.elem.style[prefixStyle("transitionProperty",transitionJudgeFunc)] = "";
            this.elem.style[prefixStyle("transitionTimingFunction",transitionJudgeFunc)] = "";
            this.elem.style[prefixStyle("transitionDuration",transitionJudgeFunc)] = "";
            return this;
        },

        /**
         * 开始执行动画
         * @method start
         * @param {Object} opt
         * @param {string} opt.timing 动画缓动策略
         * @param {string} opt.accelerate 开启3d加速
         * @param {method} opt.method 动画方式 'animation','transition','time'
         * @param {string} opt.repeat 循环次数,'infinite'表示无限循环
         * @param {string} opt.direction 动画方向(method:'animation'支持)
         * @param {string} opt.delay 延时时间 e.g. 2s
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         * @examplerun
         * <div id="aniElem"></div>
         * <style>
         * #aniElem{
         *  background:#f00;
         *  width:100px;
         *  height:100px;
         *  position:absolute;
         * }
         * </style>
         * <script type="application/javascript">
         * new window.Animate(document.getElementById("aniElem"))
         * .keyframe([{point:0,
         *  left:0,
         *  top:0
         * },{point:500,
         *  left:'100px',
         *  top:'100px'
         *  }]).start();
         * </script>
         */
        start: function(opt) {
            var self = this;
            opt = this._startOpt || extend({
                timing: "linear"
            }, opt);
            this._startOpt = opt;
            this._startOpt.repeat = this._startOpt.repeat * 1;

            var object2String = function(obj) {
                var str = "{",
                    j = 0;
                for (var i in obj) {
                    if (j++ > 0) str += ";";
                    str = str + i + ":" + obj[i];
                }
                return str + "}";
            }
            this._currentFrame = 0;
            //determine animation method
            var aniFunction = function() {
                var duration = this.keyframes[this.keyframes.length - 1].point;
                var keyFrameName = 'key' + this.uniqId;
                var aniString = "{";
                for (var i = 0, f; f = this.keyframes[i]; i++) {
                    aniString += Math.round(f.point / duration * 100) + '% ' + object2String(this._getProperty(f));
                }
                aniString += "}";
                var data = '@' + prefixCSS("keyframes",animateCSSJudgeFunc) + " " + keyFrameName + aniString;
                if (data != this.keyframeElement.data) {
                    this.keyframeElement.data = data;
                }
                this.elem.style[prefixStyle("animation",animateJudgeFunc)] = keyFrameName + " " + duration + "ms " + opt.timing;

                //set lastframe
                var lastFrame = this._getProperty(this.keyframes[this.keyframes.length - 1]);
                for (var p in lastFrame){
                    this.elem.style[p] = lastFrame[p];
                }

                //重复动画
                if(this._startOpt.repeat){
                    this.elem.style[prefixStyle("animationIterationCount",animateJudgeFunc)] = this._startOpt.repeat;
                }
                //延时
                if(this._startOpt.delay){
                    this.elem.style[prefixStyle("animationDelay",animateJudgeFunc)] = this._startOpt.delay;
                }
                //direction
                if(this._startOpt.direction){
                    this.elem.style[prefixStyle("animationDirection",animateJudgeFunc)] = this._startOpt.direction;
                }

                //结束事件
                bindEvt(this.elem, prefixStyle("animationEnd",animateJudgeFunc), function(evt) {
                    self.events.animationEnd && self.events.animationEnd.bind(self)(evt);
                });
            }

            var transFunction = function() {
                var iteration = this._currentFrame;
                var trans = function(frame1, frame2) {
                    var frames = [frame1, frame2];
                    var property = [];
                    for (var j = 0; j <= 1; j++) {
                        var frame = this._getProperty(frames[j]);
                        for (var p in frame) {
                            if (indexOf(property, p) == -1) {
                                property.push(p);
                            }
                        }
                    }

                    this.elem.style[prefixStyle("transitionDuration",transitionJudgeFunc)] = 0;

                    //set first keyframe
                    var firstFrame = this._getProperty(frame1);
                    for (var p in firstFrame) {
                        this.elem.style[p] = firstFrame[p];
                    }

                    //set first transition
                    this.elem.style[prefixStyle("transitionProperty",transitionJudgeFunc)] = property.join(",");
                    this.elem.style[prefixStyle("transitionTimingFunction",transitionJudgeFunc)] = opt.timing;
                    if (opt.accelerate) {
                        //warning:保证你没有使用transform属性，3d加速会覆盖该属性
                        this.elem.style[prefixStyle("transform",transformJudgeFunc)] = "translateZ(0)";
                    }

                    //set second keyframe
                    //wait a frame
                    this.elem.offsetWidth;
                    
                    this.elem.style[prefixStyle("transitionDuration",transitionJudgeFunc)] = (frame2.point - frame1.point) / 1000 + "s";
  
                    var secondFrame = this._getProperty(frame2);
                    for (var p in secondFrame) {
                        this.elem.style[p] = secondFrame[p];
                    }
                }

                //只有一个关键帧
                if (this.keyframes.length == 1) {
                    var frame1 = this.keyframes[0];
                    if (frame1.point > 0) {
                        this.keyframes.unshift({
                            point: 0
                        });
                    }
                }
                if (this.keyframes.length > 1) {
                    var frame1 = this.keyframes[0];
                    var frame2 = this.keyframes[1];

                    var styleText = prefixStyle("transitionDelay",transitionJudgeFunc);

                    trans.bind(this)(frame1, frame2);
                    //延时
                    if(self._startOpt.delay){
                        self.elem.style[styleText] = self._startOpt.delay;
                    }

                    iteration++;

                    bindEvt(this.elem, "transitionend", function(evt) {
                        if(!self.keyframes[iteration + 1] && self._startOpt.repeat>1) {
                            iteration = 0;
                            if(/number/i.test(typeof self._startOpt.repeat)){
                                self._startOpt.repeat --;
                            }
                        }
                        if (self.keyframes[iteration + 1]) {
                            var frame1 = self.keyframes[iteration];
                            var frame2 = self.keyframes[iteration + 1];


                            if(self.elem.style[styleText]!==0){
                                self.elem.style[styleText] = 0;
                            }

                            trans.bind(self)(frame1, frame2);
                            iteration++;
                        } else{
                            self.events.animationEnd && self.events.animationEnd.bind(self)(evt);
                        }
                    });
                }
            }
            //only support numbers
            var timeFunction = function() {
                var iteration = 0;
                var delaynum = this._startOpt.delay.replace(/[^\.\d]/g,'')*1;

                var trans = function(frame1, frame2) {
                    var property = [];
                    var interval = [];
                    var unit = [];
                    var ratio = 0;
                    //取两帧的共有属性
                    var prop1 = this._getProperty(frame1);
                    var prop2 = this._getProperty(frame2);
                    for (var p in prop1) {
                        if (prop2[p] != null) {
                            var start = parseFloat(prop1[p].toString().replace(/[^\d+-]/g, ""));
                            var end = parseFloat(prop2[p].toString().replace(/[^\d+-]/g, ""));
                            property.push({
                                prop: p,
                                start: start,
                                end: end,
                                unit: (prop2[p] == "0" ? prop1[p] : prop2[p]).toString().replace(/[\D]*\d+(?=[a-z]*)/gi, "")
                            });
                        }

                    }

                    var setValue = function(ratio) {

                        for (var i = 0, p; p = property[i]; i++) {
                            if (ratio == -1) {
                                if (/opacity/i.test(p.prop)) {
                                    //IE兼容性
                                    this.elem.style["filter"] = "alpha(opacity=" + p.end * 100 + ")";
                                }
                                this.elem.style[p.prop] = p.end + p.unit;
                            } else {
                                var value = (p.start + (p.end - p.start) * ratio).toFixed(1);
                                if (/opacity/i.test(p.prop)) {
                                    //IE兼容性
                                    this.elem.style["filter"] = "alpha(opacity=" + value * 100 + ")";
                                }
                                this.elem.style[p.prop] = value + p.unit;
                            }
                        }
                    }

                    var animationEnd = function() {
                        if (this.keyframes[iteration + 1]) {
                            trans.bind(this)(this.keyframes[iteration], this.keyframes[iteration + 1]);
                            iteration++;
                        } else if(this._startOpt.repeat > 1){
                            if(/number/i.test(typeof this._startOpt.repeat)){
                                this._startOpt.repeat--;
                                iteration = 0;
                                animationEnd.call(this);
                            } 
                        } else {
                            self.events.animationEnd && self.events.animationEnd.bind(self)();
                        }
                    }

                    //initial state
                    setValue.bind(this)(0);

                    //只有一个关键帧
                    if (this.keyframes.length == 1) {
                        var frame1 = this.keyframes[0];
                        if (frame1.point > 0) {
                            this.keyframes.unshift({
                                point: 0
                            });
                        }
                    }
                    var maxDuration = frame2.point - frame1.point;
                    var pauseTime = 0;

                    var nextFrame = function() {
                        //IE10下这个timestamp是从浏览器加载到现在经过的毫秒数
                        var drawStart = performance.now ? performance.now() : +new Date();
                        var pass = drawStart - startTime - pauseTime;

                        setValue.bind(self)(pass / maxDuration);

                        if (pass < maxDuration) {
                            if (!self._needStop) {
                                requestAnimationFrame(nextFrame);
                            } else {
                                var pauseTimePoint = performance.now ? performance.now() : +new Date();
                                pauseTime = 0;
                                self._continueFunc = function() {
                                    pauseTime = (performance.now ? performance.now() : +new Date()) - pauseTimePoint;
                                    requestAnimationFrame(nextFrame);
                                }
                            }
                        } else {
                            setValue.bind(self)(-1);
                            animationEnd.bind(self)();
                        }
                    }

                    var startTime = 0;

                    //延时
                    if(this._startOpt.delay && !this._isDelayed){
                        if(performance.now){
                            startTime = performance.now() + delaynum*1000;
                        }
                        else{
                            var d = new Date();
                            startTime = +d.setMilliseconds(d.getMilliseconds()+delaynum*1000);
                        }  
                        
                        setTimeout(function(){
                            self._isDelayed = true;
                            requestAnimationFrame(nextFrame);
                        },delaynum*1000);
                    }
                    else{
                        startTime = performance.now ? performance.now() : +new Date();
                        requestAnimationFrame(nextFrame);
                    }
                }
                this._currentFrame = iteration;
                trans.bind(this)(this.keyframes[iteration], this.keyframes[iteration + 1]);
                iteration++;
            }
            //优先使用指定的方法
            if (opt.method) {
                switch (opt.method) {
                    case "animation":
                        if (this.options.animation) {
                            aniFunction.bind(this)();
                        } else {
                            console.log("your browser does not support animation method.");
                        }
                        break;
                    case "transition":
                        if (this.options.transition) {
                            transFunction.bind(this)();
                        } else {
                            console.log("your browser does not support transition method.");
                        }
                        break;
                    case "time":
                        timeFunction.bind(this)();
                        break;
                }
            } else {
                //默认方法的顺序为transition,animation,requestAnimationFrame,settimeout
                if (this.options.transition) {
                    transFunction.bind(this)();
                } else if (this.options.animation) {
                    aniFunction.bind(this)();
                } else {
                    timeFunction.bind(this)();
                }
            }
            return this;
        },


        /**
         * 清除动画相关信息
         * @method clear
         * @return {Animate} this 返回animate对象
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         */
        clear: function() {
            //此方法用来清除动画加入的信息，使元素复位
            for (var i = 0, length = this.keyframes.length; i < length; i++) {
                var frame = this._getProperty(this.keyframes[i]);
                for (var p in frame)
                    this.elem.style[p] = "";
            }
            return this;
        },

        /**
         * 绑定事件
         * @method on
         * @param {string} event 事件名称
         * @param {Function} cb 事件处理方法
         * @changelist 1.1:新增
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         */
        on: function(event, cb) {
            if (event == "animationend") {
                this.events.animationEnd = cb;
            } else {
                bindEvt(this.elem, event, cb);
            }
            return this;
        },

        /**
         * 停止动画，下次将从第一帧开始动画
         * @method stop
         * @return {Animate} this 返回animate对象
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         */
        stop: function() {
            this._needStop = true;
            this._currentFrame = 0;
            return this;
        },

        /**
         * 只支持time动画方式
         * 暂停动画，下次将继续动画
         * @method pause
         * @return {Animate} this 返回animate对象
         * @changelist 1.1:新增
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         */
        pause: function() {
            this._needStop = true;
            return this;
        },

        /**
         * 只支持time动画方式
         * 继续动画
         * @method continuePlay
         * @return {Animate} this 返回animate对象
         * @changelist 1.1:新增
         * @support ie:>=6,chrome:all,firefox:all
         * @for Animate
         */
        continuePlay: function() {
            if (this._needStop == true) {
                if (this._startOpt && this._startOpt.method == "time") {
                    this._needStop = false;
                    this._continueFunc && this._continueFunc();
                    this._continueFunc = null;
                } else {
                    this._needStop = false;
                    this.clear();
                    this.start();
                }
            }
            return this;
        }

    };
    exports.Animate = Animate;
})(window);