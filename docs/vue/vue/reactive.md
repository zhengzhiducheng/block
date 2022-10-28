### 使用

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <div id="app"></div>
    <!-- <script src="../../../node_modules/vue/dist/vue.global.js"></script> -->
    <script src="./reactivity.global.js"></script>
    <script>
      const { ref, effect, reactive, toRefs, toRef, proxyRefs, effectScope } =
        VueReactivity; // 我们reactive他支持一个对象类型

      // 声明了响应式的数据 数据在effect中使用 依赖收集的过程。  我们希望能停止收集依赖
      // effect.stop() 只能停止某一个effect
      const state = reactive({ name: "zf" });
      let scope = effectScope();
      // 状态集中管理 ， 全部停止掉
      // effectScope 需要收集对应effect (依赖收集)
      scope.run(() => {
        let runner = effect(() => {
          console.log(state.name, "outer");
        });
        effect(() => {
          console.log(state.name, "outer");
        });
        runner.effect.stop();
        // const innerScope = effectScope(false);
        // innerScope.run(()=>{
        //      effect(()=>{
        //         console.log(state.name,'inner');
        //      })
        // })
      });
      // scope.stop();
      setTimeout(() => {
        state.name = "jw";
      }, 1000);
    </script>
  </body>
</html>
```

### baseHandler

```js
import { isObject } from "@vue/shared";
import { reactive } from "./reactive";
import { track, trigger } from "./effect";

export const enum ReactiveFlags {
    IS_REACTIVE = '__v_isReactive'
}
export const mutableHandlers = {
    get(target,key,receiver){
        if(key === ReactiveFlags.IS_REACTIVE){
            return true;
        }
        track(target,'get',key)
        // 去代理对象上取值 就走get
        // 这里可以监控到用户取值了
        let res =  Reflect.get(target,key,receiver)

        if(isObject(res)){
            return reactive(res); // 深度代理实现, 性能好 取值就可以进行代理
        }
        return res;
    },
    set(target,key,value,receiver){
        // 去代理上设置值 执行set
        let oldValue = target[key];
        let result = Reflect.set(target,key,value,receiver);
        if(oldValue !== value){ // 值变化了
            // 要更新
            trigger(target,'set',key,value,oldValue)
        }
        // 这里可以监控到用户设置值了
        return result
    }
}



```

### computed

```js
import { isFunction } from "@vue/shared"
import { activeEffect, ReactiveEffect, track, trackEffects, triggerEffects } from "./effect";
class ComputedRefImpl{
    public effect;
    public _dirty = true; // 默认应该取值的时候进行计算
    public __v_isReadonly = true
    public __v_isRef = true
    public _value;
    public dep = new Set;
    constructor( getter, public setter){
        // 我们将用户的getter放到effect中，这里面firstname和lastname就会被这个effect收集起来
        this.effect = new ReactiveEffect(getter,()=>{
            // 稍后依赖的属性变化会执行此调度函数
            if(!this._dirty){
                this._dirty = true;
                // 实现一个触发更新
                triggerEffects(this.dep);
            }
        })
    }
    // 类中的属性访问器 底层就是Object.defineProperty
    get value(){
        // 做依赖收集
        trackEffects(this.dep)  //
        if(this._dirty){ // 说明这个值是脏的
            this._dirty = false;
            this._value = this.effect.run();
        }
        return this._value;
    }
    set value(newValue){
        this.setter(newValue)
    }
}
export const computed = (getterOrOptions) =>{
    let onlyGetter =  isFunction(getterOrOptions);
    let getter;
    let setter;
    if(onlyGetter){
        getter = getterOrOptions;
        setter = () =>{console.warn('no set')}
    }else{
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter,setter)
}



```

### effect

```js
import { recordEffectScope } from "./effectScope";

export let activeEffect = undefined;

function cleanupEffect(effect){
    const {deps} = effect; // deps 里面装的是name对应的effect, age对应的effect
    for(let i = 0; i < deps.length;i++){
        deps[i].delete(effect); // 解除effect，重新依赖收集
    }
    effect.deps.length = 0;
}

export class ReactiveEffect {
    // 这里表示在实例上新增了active属性
    public parent = null;
    public deps = []
    public active = true; // 这个effect默认是激活状态
    constructor(public fn,public scheduler?){
        recordEffectScope(this);
    } // 用户传递的参数也会当this上 this.fn = fn
    run(){ // run就是执行effect
        if(!this.active){ return this.fn()}; // 这里表示如果是非激活的情况，只需要执行函数，不需要进行依赖收集
        // 这里就要依赖收集了  核心就是将当前的effect 和 稍后渲染的属性关联在一起
        try{
            this.parent = activeEffect
            activeEffect = this;
            // 这里我们需要在执行用户函数之前将之前收集的内容清空
            cleanupEffect(this)
            return this.fn(); // 当稍后调用取值操作的时候 就可以获取到这个全局的activeEffect了
        }finally{
            activeEffect = this.parent;
        }
    }
    stop(){
        if(this.active){
            this.active = false;
            cleanupEffect(this); // 停止effect的收集
        }
    }
}
export function effect(fn,options:any={}){



    // 这里fn可以根据状态变化 重新执行， effect可以嵌套着写
    const _effect =  new ReactiveEffect(fn,options.scheduler); // 创建响应式的effect
    _effect.run(); // 默认先执行一次
    const runner = _effect.run.bind(_effect); // 绑定this执行
    runner.effect = _effect; // 将effect挂载到runner函数上
    return runner
}

// 一个effect 对应多个属性， 一个属性对应多个effect
// 结论：多对多
const targetMap = new WeakMap();
export function track(target,type,key){
    if(!activeEffect) return;
    let depsMap = targetMap.get(target); // 第一次没有
    if(!depsMap){
        targetMap.set(target,(depsMap = new Map()))
    }
    let dep = depsMap.get(key);// key -> name / age
    if(!dep){
        depsMap.set(key,(dep = new Set()))
    }
    trackEffects(dep);
    // 单向指的是 属性记录了effect,方向记录，应该让effect也记录他被哪些属性收集过， 这样做的好处是为了可以清理
    // 对象 某个属性 -》 多个effect
    // WeakMap = {对象:Map{name:Set-》effect}}
    // {对象:{name:[]}}
}
export function trackEffects(dep){
    if(activeEffect){
        let shouldTrack = !dep.has(activeEffect); // 去重了
        if(shouldTrack){
            dep.add(activeEffect);
            // 存放的是属性对应的set
            activeEffect.deps.push(dep); // 让effect记录住对应的dep， 稍后清理的时候会用到
        }
    }
}
export function trigger(target,type,key,value,oldValue){
    const depsMap = targetMap.get(target);
    if(!depsMap) return; // 触发的值不在模板中使用

    let effects = depsMap.get(key); // 找到了属性对应的effect

    // 永远在执行之前 先拷贝一份来执行， 不要关联引用
    if(effects){
        triggerEffects(effects)
    }
}
export function triggerEffects(effects){
    effects = new Set(effects);
    effects.forEach(effect => {
        // 我们在执行effect的时候 又要执行自己，那我们需要屏蔽掉，不要无线调用
        if(effect !== activeEffect) {
            if(effect.scheduler){
                effect.scheduler(); // 如果用户传入了调度函数，则用用户的
            }else{
                effect.run() // 否则默认刷新视图
            }
        }
    });
}
// 这个执行流程 就类似于一个树形结构


// effect(()=>{   // parent = null;  activeEffect = e1
//     state.name   // name -> e1
//     effect(()=>{  // parent = e1   activeEffect = e2
//         state.age // age -> e2
//     })

//     state.address // activeEffect = this.parent


//     effect(()=>{  // parent = e1   activeEffect = e3
//         state.age // age -> e3
//     })
// })


// 1) 我们先搞了一个响应式对象 new Proxy
// 2) effect 默认数据变化要能更新，我们先将正在执行的effect作为全局变量，渲染（取值）， 我们在get方法中进行依赖收集
// 3) weakmap (对象 ： map(属性：set（effect）))
// 4) 稍后用户发生数据变化，会通过对象属性来查找对应的effect集合，找到effect全部执行



```

### effectScope

```js
// effectScope 可以存储 effectScope
// effectScope => effect;

// 父effectScope -》 子effectScope -》 effect
// 父effectScope.stop() 停止自己家的effect  执行子effectScope.stop() 同时停止自己的effect

// 以前vue3.2 之前可以自己收集 子集做stop

export let activeEffectScope = null;
class EffectScope {
  active = true;
  parent = null;
  effects = []; // 此scope记录的effect
  scopes = []; // effectScope 还有可能要收集子集的effectScope
  constructor(detached) {
    // 只有不独立的才要收集
    if (!detached && activeEffectScope) {
      activeEffectScope.scopes.push(this);
    }
  }
  run(fn) {
    if (this.active) {
      try {
        this.parent = activeEffectScope;
        activeEffectScope = this;

        return fn();
      } finally {
        activeEffectScope = this.parent;
      }
    }
  }
  stop() {
    if (this.active) {
      for (let i = 0; i < this.effects.length; i++) {
        this.effects[i].stop();
      }
      for (let i = 0; i < this.scopes.length; i++) {
        this.scopes[i].stop();
      }
      this.active = false;
    }
  }
}
export function recordEffectScope(effect) {
  if (activeEffectScope && activeEffectScope.active) {
    activeEffectScope.effects.push(effect);
  }
}

export function effectScope(detached = false) {
  return new EffectScope(detached);
}
```

### index

```js
export { effect } from "./effect";
export { reactive } from "./reactive";
export { computed } from "./computed";

export { watch } from "./watch";
export * from "./ref";

export * from "./effect";

export * from "./effectScope";
```

### reactive

```js
import { isObject } from "@vue/shared";
import { mutableHandlers, ReactiveFlags } from "./baseHandler";
// 1) 将数据转化成响应式的数据, 只能做对象的代理
const reactiveMap = new WeakMap(); // key只能是对象

// 1）实现同一个对象 代理多次，返回同一个代理
// 2）代理对象被再次代理 可以直接返回

export function isReactive(value) {
  return !!(value && value[ReactiveFlags.IS_REACTIVE]);
}

export function reactive(target) {
  if (!isObject(target)) {
    return;
  }
  if (target[ReactiveFlags.IS_REACTIVE]) {
    // 如果目标是一个代理对象，那么一定被代理过了，会走get
    return target;
  }
  // 并没有重新定义属性，只是代理，在取值的时候会调用get，当赋值值的时候会调用set
  let exisitingProxy = reactiveMap.get(target);
  if (exisitingProxy) {
    return exisitingProxy;
  }
  // 第一次普通对象代理，我们会通过new Proxy代理一次
  // 下一次你传递的是proxy 我们可以看一下他有没有代理过，如果访问这个proxy 有get方法的时候说明就访问过了
  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  return proxy;
}

// --------------------------------------
// let target = {
//     name:'zf',
//     get alias(){
//         return this.name
//     }
// }
// const proxy = new Proxy(target,{
//     get(target,key,receiver){
//         // 去代理对象上取值 就走get
//         // return target[key];
//         console.log(key);
//         return Reflect.get(target,key,receiver)
//     },
//     set(target,key,value,receiver){
//         // 去代理上设置值 执行set

//         return Reflect.set(target,key,value,receiver);
//     }
// });
// proxy.alias; // 去alais上取了值时，也去了name，当时没有监控到name

// 我在页面中使用了alias对应的值，稍后name变化了 要重新渲染么？
```

### ref

```js
import { isArray, isObject } from "@vue/shared";
import { trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";


function toReactive(value){
    return isObject(value)? reactive(value) : value
}
class RefImpl{
    public dep = new Set;
    public _value;
    public __v_isRef = true
    constructor(public rawValue){
        this._value = toReactive(rawValue);
    }
    get value(){
        trackEffects(this.dep)
        return this._value
    }
    set value(newValue){ // watch
        if(newValue !== this.rawValue){
            this._value = toReactive(newValue);
            this.rawValue = newValue
            triggerEffects(this.dep);
        }
    }
}
export function ref(value){
    return new RefImpl(value);
}
class ObjectRefImpl{ // 只是将.value属性代理到原始类型上
    constructor(public object,public key){}
    get value(){
        return this.object[this.key];
    }
    set value(newValue){
        this.object[this.key] = newValue
    }
}

export function toRef(object,key){
    return new ObjectRefImpl(object,key);
}

export function toRefs(object){
    const result = isArray(object) ? new Array(object.length) : {};

    for(let key in object){
        result[key] = toRef(object,key);
    }

    return result
}

export function proxyRefs(object){
    return new Proxy(object,{
        get(target,key,recevier){
           let r = Reflect.get(target,key,recevier);
           return r.__v_isRef ? r.value :r
        },
        set(target,key,value,recevier){
            let oldValue =  target[key];
            if(oldValue.__v_isRef){
                oldValue.value = value;
                return true;
            }else{
                return Reflect.set(target,key,value,recevier);
            }
        }
    })
}

```

### watch

```js
import { isFunction, isObject } from "@vue/shared";
import { ReactiveEffect } from "./effect";
import { isReactive } from "./reactive";

function traversal(value, set = new Set()) {
  // 考虑如果对象中有循环引用的问题
  // 第一步递归要有终结条件，不是对象就不在递归了
  if (!isObject(value)) return value;
  if (set.has(value)) {
    return value;
  }
  set.add(value);
  for (let key in value) {
    traversal(value[key], set);
  }
  return value;
}

// source 是用户传入的对象, cb 就是对应的用户的回调
export function watch(source, cb) {
  let getter;
  if (isReactive(source)) {
    // 对我们用户传入的数据 进行循环 （递归循环，只要循环就会访问对象上的每一个属性，访问属性的时候会收集effect）
    getter = () => traversal(source);
  } else if (isFunction(source)) {
    getter = source;
  } else {
    return;
  }
  let cleanup;
  const onCleanup = (fn) => {
    cleanup = fn; // 保存用户的函数
  };
  let oldValue;
  const job = () => {
    if (cleanup) cleanup(); // 下一次watch开始触发上一次watch的清理
    const newValue = effect.run();
    cb(newValue, oldValue, onCleanup);
    oldValue = newValue;
  };
  // 在effect中范文属性就会依赖收集
  const effect = new ReactiveEffect(getter, job); // 监控自己构造的函数，变化后重新执行job
  oldValue = effect.run();
}
// watch = effect 内部会保存老值和新值调用方法
```
