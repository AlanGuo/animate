/**
 * 简单的线性动画库，在UI上提供基础的DOM动画能力
 * @author alandlguo
 * 2013/06/06
 */

 (function(exports){
 	//检测浏览器引擎
 	var unid = 0;
 	var vendors = 't,webkitT,MozT,msT,OT'.split(',');
 	var vendorsCSS = 't,-webkit-t,-moz-t,-ms-t,-o-t'.split(',');
 	var performance = window.performance || {};

 	if (!Function.bind) {
		Function.prototype.bind = function () {
			var __method = this;
			var args = Array.prototype.slice.call(arguments);
			var object = args.shift();

			return function () {
				return __method.apply(object,
					args.concat(Array.prototype.slice.call(arguments)));
			};
		};
	}

 	var judge = function(vendors){
 		var dummyStyle = document.createElement('div').style;
 		var v = 't,webkitT,MozT,msT,OT'.split(','),
 			t,
			i = 0,
			l = vendors.length;

		for ( ; i < l; i++ ) {
			t = v[i] + 'ransform';
			if ( t in dummyStyle ) {
				return vendors[i].substr(0, vendors[i].length - 1);
			}
		}

		return false;
 	}
	//前缀
 	var prefixStyle = function (style) {
 		var vendor = judge(vendors);
		if ( vendor === '' ) return style;
		style = style.charAt(0).toUpperCase() + style.substr(1);
		return vendor + style;
	}
	var prefixCSS = function (style) {
		var vendor = judge(vendorsCSS);
		if ( vendor === '' ) return style;
		style = style.charAt(0) + style.substr(1);
		return vendor + style;
	}

	var bindEvt = function(elem,event,handler){
		if(elem.addEventListener){
			elem.addEventListener(event,handler,false);
		}
		else{
			//IE8 older
			elem.attachEvent("on"+event,function(){handler.call(elem,window.event)});
		}
	}

	var extend = function(obj,ext){
		for(var p in ext){
			obj[p] = ext[p];
		}
		return obj;
	}

	var indexOf = function(array,item){
		if(array.indexOf) return array.indexOf(item);
		else{
			for(var i=0,p;p=array[i];i++){
				if(p === item) return i;
			}
			return -1;
		}
	}

	var requestAnimationFrame = window[prefixStyle("requestAnimationFrame")] || 
	function(callback){setTimeout(callback,17)};

	//全局唯一的style标签
	var cssAnimation = document.createElement('style');
	cssAnimation.setAttribute("id","ex_animate_style");
	cssAnimation.type = 'text/css';
	document.getElementsByTagName("head")[0].appendChild(cssAnimation);

 	/**
 	 * 动画类
 	 * @class Animate
 	 * @constructor
 	 */
 	var Animate = function(){
 		this._init.apply(this,arguments);
 	}

 	Animate.prototype = {
 		css:document.getElementById("ex_animate_style"),

 		/**
 		 * 系统关键字
 		 * @private
 		 */
 		 _keywords : ["point","timing"],

		/**
 		 * 事件
 		 * @private
 		 */
 		 _events:[],

 		/**
 		 * 当前动画使用的方法
 		 * @private
 		 */
 		 _method:null,

 		 /**
 		  * 当前帧
 		  * @private
 		  */
 		 _currentFrame:0,

 		 /**
 		  * 用来控制暂停
 		  * @private
 		  */
 		 _needStop:false,

 		/**
 		 * 初始化
 		 * @private
 		 */
 		_init:function(elem,opts){
 			opts = opts || {};
 			this.elem = elem;
 			this.options = extend({},opts);
 			this.keyframes = [];
 			this.keyframesString =[];
 			this.uniqId = ++unid;

 			//检测兼容性
 			//css3 keyframe支持
 			//css3 transform支持
 			//css3 transition支持
 			//requestNextFrame 支持
 			//setTimeout
 			var dummyStyle = document.createElement("div").style;
 			var transform = prefixStyle("transform");
 			var transition = prefixStyle("transition");
 			var animation = prefixStyle("animation");
 			//if(transform in dummyStyle) this.options.transform = true;
 			if(transition in dummyStyle) this.options.transition = true;
 			if(animation in dummyStyle) this.options.animation = true;
 			//if(window.requestAnimationFrame) this.options.requestAnimationFrame = true;

 			//set keyframe element
 			if(this.options.animation){
	 			var rules = document.createTextNode("");
	 			this.css.appendChild(rules);
	 			this.keyframeElement = rules;
 			}
 		},

 		/**
 		 * 更换动画元素，动画本身不变
 		 */
 		 setElement:function(elem){
 		 	this.elem = elem;
 		 },


 		/**
 		 * 得到动画相关属性
 		 */
 		 _getProperty:function(frame){
 		 	var obj = {};
 		 	for(var p in frame){
	 			if(indexOf(this._keywords,p)==-1)
	 				obj[p] = frame[p];
 		 	}
 		 	return obj;
 		 },

 		/**
 		 * 设置关键帧
 		 * @param {Object} frames 关键帧
 		 * @return {Animate} this 返回当前Animate对象
 		 * @example
 		 	obj.keyframe({point:0
				left:0,
				top:0,
				ease:"linear"
 		 	}).keyframe({point:10,
				left:'-100px',
				top:'-100px',
				ease:"linear"
 		 	})

 		 	obj.keyframe([{point:0,x:0,y:0},{...}]);
 		 */
 		keyframe:function(frames){
 			this.keyframes = this.keyframes.concat(frames);
 			return this;
 		},

 		/**
 		 * 重置动画对象，清空关键帧
 		 */
 		reset:function(){
 			this.keyframes = [];
 		},


 		/**
 		 * 开始执行动画
 		 */
 		start:function(opt){
 			opt = extend({timing:"linear"},opt);
 			var object2String=function (obj) {
				var str = "{",j=0;
				for(var i in obj){
					if(j++>0) str+=";";
					str = str+i+":"+obj[i];
				}
				return str+"}";
			}
			this._currentFrame = 0;
 			//determine animation method
 			var aniFunction = function(){
 				var duration = this.keyframes[this.keyframes.length-1].point;
				var keyFrameName = 'key'+this.uniqId;
				var aniString = "{";
				for(var i=0,f;f=this.keyframes[i];i++){
					aniString += Math.round(f.point/duration*100)+'% '+object2String(this._getProperty(f));
				}
				aniString+="}";
				var data = '@'+prefixCSS("keyframes")+" "+keyFrameName+aniString;
				if(data != this.keyframeElement.data){
					this.keyframeElement.data = data;
				}
				this.elem.style[prefixStyle("animation")] = keyFrameName +" " +duration+"ms "+opt.timing;

				//set lastframe
				var lastFrame = this._getProperty(this.keyframes[this.keyframes.length-1]);
				for(var p in lastFrame)
					this.elem.style[p] = lastFrame[p];

				//结束事件
				bindEvt(this.elem,prefixStyle("animationEnd"),function(evt){
					opt.onAnimationEnd && opt.onAnimationEnd();
				});
 			}

 			var transFunction=function(){
 				var iteration = this._currentFrame;
				var trans = function(frame1,frame2){
					var frames = [frame1,frame2];
					var property = [];
					for(var j=0;j<=1;j++){
						var frame = this._getProperty(frames[j]);
	 					for(var p in frame){
	 						if(indexOf(property,p)==-1){
	 							property.push(p);
	 						}
	 					}
					}

					this.elem.style[prefixStyle("transitionDuration")] = 0;

					//set first keyframe
					var firstFrame = this._getProperty(frame1);
					for(var p in firstFrame){
						this.elem.style[p] = firstFrame[p];
					}
					
					//set first transition
					this.elem.style[prefixStyle("transitionProperty")] = property.join(",");
					this.elem.style[prefixStyle("transitionTimingFunction")] = opt.timing;

					//set second keyframe
					//使用settimeout才能确保动画正常触发
					var _this = this;
					var time = setTimeout(function(){
						_this.elem.style[prefixStyle("transitionDuration")] = (frame2.point-frame1.point)/1000 + "s";

						var secondFrame = _this._getProperty(frame2);
						for(var p in secondFrame){
							_this.elem.style[p] = secondFrame[p];
						}
						clearTimeout(time);
					},100)
				}

				if(this.keyframes.length>1){
					var frame1 = this.keyframes[0];
					var frame2 = this.keyframes[1];
					trans.bind(this)(frame1,frame2);
					iteration++;

					var _this = this;
					bindEvt(this.elem,"transitionend",function(evt){
						if(_this.keyframes[iteration+1]){
							var frame1 = _this.keyframes[iteration];
							var frame2 = _this.keyframes[iteration+1];

							trans.bind(_this)(frame1,frame2);
							iteration++;
						}
						else{
							opt.onAnimationEnd && opt.onAnimationEnd();
						}
					});
				}
 			}
 			//only support numbers
 			var timeFunction = function(){
 				var iteration = 0;
 				var trans = function(frame1,frame2){
					var property = [];
					var interval = [];
					var unit = [];
					var ratio = 0;
					//取两帧的共有属性
					var prop1 = this._getProperty(frame1);
					var prop2 = this._getProperty(frame2);
 					for(var p in prop1){
 						if(prop2[p]!=null){
 							var start = parseFloat(prop1[p].toString().replace(/[^\d+-]/g,""));
 							var end = parseFloat(prop2[p].toString().replace(/[^\d+-]/g,""));
 							property.push({prop:p,
 								start:start,
 								end:end,
 								unit:(prop2[p]=="0"?prop1[p]:prop2[p]).toString().replace(/[\D]*\d+(?=[a-z]*)/gi,"")});
 						}

 					}

					var setValue = function(ratio){

						for(var i=0,p;p = property[i];i++){
							if(ratio==-1){
								if(/opacity/i.test(p.prop)){
									//IE兼容性
									this.elem.style["filter"] = "alpha(opacity="+p.end*100+")";
								}
								this.elem.style[p.prop] = p.end+p.unit;
							}
							else{
								var value = (p.start+(p.end-p.start)*ratio).toFixed(1);
								if(/opacity/i.test(p.prop)){
									//IE兼容性
									this.elem.style["filter"] = "alpha(opacity="+value*100+")";
								}
								this.elem.style[p.prop] = value+p.unit;
							}
						}
					}

					var animationEnd = function(){
						if(this.keyframes[iteration+1]){
							trans.bind(this)(this.keyframes[iteration],this.keyframes[iteration+1]);
							iteration++;
						}
						else{
							opt.onAnimationEnd && opt.onAnimationEnd();
						}
					}

					//initial state
					setValue.bind(this)(0);

					var _this = this;
					var maxDuration = frame2.point-frame1.point;

					var nextFrame = function(){
						//IE10下这个timestamp是从浏览器加载到现在经过的毫秒数
						var drawStart = performance.now?performance.now(): +new Date();
						var pass = drawStart - startTime;

						setValue.bind(_this)(pass/maxDuration);

						if(pass < maxDuration)
							if(!_this._needStop)
								requestAnimationFrame(nextFrame);
						else{
							setValue.bind(_this)(-1);
							animationEnd.bind(_this)();
						}
					}
					var startTime = performance.now?performance.now(): +new Date();
					requestAnimationFrame(nextFrame);
				}
				this._currentFrame = iteration;
				trans.bind(this)(this.keyframes[iteration],this.keyframes[iteration+1]);
				iteration++;
 			}
 			//优先使用指定的方法
 			if(this.options.method){
 				switch(this.options.method){
 					case "animation":
 						if(this.options.animation){
 							aniFunction.bind(this)();
 						}
 						else{
 							console.log("your browser does not support animation method.");
 						}
 					break;
 					case "transition":
 						if(this.options.transition){
 							transFunction.bind(this)();
 						}
 						else{
 							console.log("your browser does not support transition method.");
 						}
 					break;
 					case "time":
 						timeFunction.bind(this)();
 					break;
 				}
 			}
 			else{
 				//默认方法的顺序为animation,transition,requestAnimationFrame,settimeout
	 			if(this.options.animation){
	 				aniFunction.bind(this)();
	 			}
	 			else if(this.options.transtion){
	 				transFunction.bind(this)();
	 			}
	 			else{
	 				timeFunction.bind(this)();
	 			}
 			}
 			return this;
 		},


	   /**
		* 清除动画相关信息
		*/
		clear:function(){
		 	//此方法用来清除动画加入的信息，使元素复位
		 	for(var i=0,length = this.keyframes.length;i<length;i++){
		 		var frame = this._getProperty(this.keyframes[i]);
		 		for(var p in frame)
					this.elem.style[p] = "";
		 	}	
		},

		/**
 		 * 绑定事件
 		 */
 		on:function(event,cb){
 			bindEvt(this.elem,event,cb);
 			return this;
 		},

		/**
 		 * 停止动画，下次将从第一帧开始动画
 		 */
 		stop:function(){
 			this._needStop = true;
 			this._currentFrame = 0;
 		},

		/**
		 * 只支持time动画方式
 		 * 暂停动画，下次将继续动画
 		 */
 		pause:function(){
 			this._needStop = true;
 		},

 		/**
 		 * 只支持time动画方式
 		 * 继续动画
 		 */
 		 continuePlay:function(){
 		 	this._needStop = false;
 		 	timeFunction.bind(this)();
 		 }

 	};
 	exports.Animate = Animate;
 })(window);
