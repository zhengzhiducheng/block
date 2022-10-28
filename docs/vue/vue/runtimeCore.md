### components

###### KeepAlive

```js
import { isVnode } from "../vnode";
import { getCurrentInstance } from "../component";
import { ShapeFlags } from "@vue/shared";
import { onMounted, onUpdated } from "../apiLifecycle";

function resetShapeFlag(vnode) {
  let shapeFlag = vnode.shapeFlag;
  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
  }
  if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
    shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE;
  }
  vnode.shapeFlag = shapeFlag;
}

export const KeepAliveImpl = {
  __isKeepAlive: true,
  props: {
    include: {}, // 要缓存的有哪些
    exclude: {}, // 哪些不要缓存  字符串 'a,b,c'  ['a','b','c']  reg
    max: {},
  },
  setup(props, { slots }) {
    // My1 => My2

    const keys = new Set(); //  缓存的key
    const cache = new Map(); // 哪个key 对应的是哪个虚拟节点

    const instance = getCurrentInstance();
    let { createElement, move } = instance.ctx.renderer;
    const storageContainer = createElement("div"); // 稍后我们要把渲染好的组件移入进去

    instance.ctx.deactivate = function (vnode) {
      move(vnode, storageContainer); // 移入到

      // 调用deactivate()
    };
    instance.ctx.activate = function (vnode, container, anchor) {
      move(vnode, container, anchor); // 移入到
      // move(vnode,storageContainer); // 移入到

      // 调用activate()
    };
    let pendingCacheKey = null;
    // 我怎么操作dom元素
    function cacheSubTree() {
      if (pendingCacheKey) {
        cache.set(pendingCacheKey, instance.subTree); // 挂载完毕后缓存当前实例对应的subTree
      }
    }
    onMounted(cacheSubTree);
    onUpdated(cacheSubTree);
    const { include, exclude, max } = props; // watch include 与exclude的关系

    let current = null;
    function pruneCacheEntry(key) {
      resetShapeFlag(current);
      cache.delete(key);
      keys.delete(key);
    }

    // 本身keep-alive
    return () => {
      // keeyp-alive本身没有功能，渲染的是插槽
      // keep-alive 默认会取去slots的default属性 返回的虚拟节点的第一个
      let vnode = slots.default();

      // 看一下vnode是不是组件，只有组件才能缓存
      // 必须是虚拟节点而且是带状态的组件
      if (
        !isVnode(vnode) ||
        !(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT)
      ) {
        return vnode;
      }
      const comp = vnode.type;
      const key = vnode.key == null ? comp : vnode.key;

      let name = comp.name; // 组件的名字 ， 可以根据组件的名字来决定是否需要缓存

      if (
        (name && include && !include.split(",").includes(name)) ||
        (exclude && exclude.split(",").includes(name))
      ) {
        return vnode;
      }

      let cacheVnode = cache.get(key); // 找有没有缓存过
      if (cacheVnode) {
        vnode.component = cacheVnode.component; // 告诉复用缓存的component
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE; // 标识初始化的时候 不要走创建了

        keys.delete(key);
        keys.add(key);
      } else {
        keys.add(key); // 缓存key
        pendingCacheKey = key;

        if (max && keys.size > max) {
          // 迭代器 {next()=>{value:done}}
          pruneCacheEntry(keys.values().next().value);
        }
      }
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE; // 标识这个组件稍后是假的卸载
      current = vnode;

      return vnode; // 组件 -》 组件渲染的内容
    };
  },
};

export const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
```

###### Teleport

```js
export const TeleportImpl = {
  __isTeleport: true,
  process(n1, n2, container, anchor, internals) {
    let { mountChildren, patchChildren, move } = internals;
    if (!n1) {
      const target = document.querySelector(n2.props.to);
      if (target) {
        mountChildren(n2.children, target);
      }
    } else {
      patchChildren(n1, n2, container); // 儿子内容变化   这个时候还是发生在老容器中的

      if (n2.props.to !== n1.props.to) {
        // 传送的位置发生了变化
        const nextTagert = document.querySelector(n2.props.to);

        n2.children.forEach((child) => {
          // 将更新后的孩子放到新的容器里  移动到新的容器中
          move(child, nextTagert);
        });
      }
    }
  },
};

export const isTeleport = (type) => type.__isTeleport;
```

### apiInject

```js
import { currentInstance } from "./component";

// provides: parent ? parent.provides : Object.create(null)

//  // parent :  {state:'xxx'}  -> child :  {state:'xxx'} -> grandson : {}
export function provide(key, value) {
  if (!currentInstance) return; // 此proivide 一定要用到setup语法中
  const parentProvides =
    currentInstance.parent && currentInstance.parent.provides;

  let provides = currentInstance.provides; // 自己的provides
  // 自己的provides 不能定义在父亲上，否则会导致儿子提供的属性 父亲也能用
  if (parentProvides === provides) {
    // 此时只有第一次provide 相同，第二次是不同的
    // 原型查找
    provides = currentInstance.provides = Object.create(provides);
  }
  provides[key] = value;
}
export function inject(key, defaultValue) {
  // 只是查找
  if (!currentInstance) return; // 此inject 一定要用到setup语法中
  const provides = currentInstance.parent && currentInstance.parent.provides;
  if (provides && key in provides) {
    // 通过父亲的proivides 将属性返回
    return provides[key];
  } else if (arguments.length > 1) {
    return defaultValue;
  }
}
```

### apiLifecycle

```js
import { currentInstance,setCurrentInstance } from "./component"

export const enum LifecycleHooks {
    BEFORE_MOUNT = 'bm',
    MOUNTED ='m',
    BEFORE_UPDATE = 'bu',
    UPDATED = 'u'
}

function createHook(type){
    return (hook,target = currentInstance)=>{ // hook 需要绑定到对应的实例上。 我们之前写的依赖收集
        if(target){ // 关联此currentInstance和hook
            const hooks = target[type] || ( target[type]  = []);
            const wrappedHook = ()=>{
                setCurrentInstance(target)
                hook(); // 将当前实例保存到currentInstance上
                setCurrentInstance(null);
            }
            hooks.push(wrappedHook); // 稍后执行hook的时候 这个instance指代的是谁呢？
        }
    }
}

// 工厂模式
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate =createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated =createHook(LifecycleHooks.UPDATED)





```

### component

```js
import { proxyRefs, reactive } from "@vue/reactivity";
import { hasOwn, isFunction, isObject, ShapeFlags } from "@vue/shared";
import { initProps } from "./componentProps";
export let currentInstance = null;
export const setCurrentInstance = (instance) =>currentInstance = instance;
export const getCurrentInstance = ()=>currentInstance;



export function createComponentInstance(vnode,parent){
    const instance = { // 组件的实例
        ctx:{}, // 实例的上下文
        provides: parent ? parent.provides : Object.create(null), // 所有的组件用的都是父亲的provides
        parent,
        data:null,
        vnode,  // vue2的源码中组件的虚拟节点叫$vnode  渲染的内容叫_vnode
        subTree:null, // vnode组件的虚拟节点   subTree渲染的组件内容
        isMounted:false,
        update:null,
        propsOptions:vnode.type.props,
        props:{},
        attrs:{},
        proxy:null,
        render:null,
        setupState:{},
        slots:{} // 这里就是插槽相关内容
    }
    return instance
}
const publicPropertyMap = {
    $attrs:(i)=> i.attrs,
    $slots:(i)=> i.slots
}
const publicInstanceProxy = {
    get(target,key){
        const {data,props,setupState} = target;
        if(data && hasOwn(data,key)){
            return data[key];
        }else if(hasOwn(setupState,key)){
            return setupState[key]
        }else if(props && hasOwn(props,key)){
            return props[key];
        }
        // this.$attrs
        let getter =  publicPropertyMap[key]; //this.$attrs
        if(getter){
            return getter(target)
        }
    },
    set(target,key,value){
        const {data,props,setupState} = target;
        if(data && hasOwn(data,key)){
            data[key] =value;
            // 用户操作的属性是代理对象，这里面被屏蔽了
            // 但是我们可以通过instance.props 拿到真实的props
        }else if(hasOwn(setupState,key)){
            setupState[key] = value
        }else if(props && hasOwn(props,key)){
            console.warn('attempting to mutate prop ' + (key as string))
            return false;
        }
        return true;
    }
}
function initSlots(instance,children){
    if(instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN){
        instance.slots = children; // 保留children
    }
}
export function setupComponent(instance){
    let { props ,type ,children} = instance.vnode
    initProps(instance,props);
    initSlots(instance,children); // 初始化插槽
    instance.proxy = new Proxy(instance,publicInstanceProxy)
    let data = type.data

    if(data){
        if(!isFunction(data)) return console.warn('data option must be a function')
        instance.data = reactive(data.call(instance.proxy));
    }
    let setup = type.setup
    if(setup){
        const setupContext = { // 典型的发布订阅模式
            emit:(event,...args)=>{ // 事件的实现原理
                const eventName = `on${event[0].toUpperCase() + event.slice(1)}`
                // 找到虚拟节点的属性有存放props
                const handler = instance.vnode.props[eventName];
                handler && handler(...args)
            },
            attrs:instance.attrs,
            slots:instance.slots
        } // x
        setCurrentInstance(instance);
        const setupResult = setup(instance.props,setupContext);
        setCurrentInstance(null);

        if(isFunction(setupResult)){
            instance.render = setupResult
        }else if(isObject(setupResult)){
            // 对内部的ref 进行取消.value
            instance.setupState = proxyRefs(setupResult)
        }

    }
    if(!instance.render){
        instance.render = type.render
    }
}

export function renderComponent(instance){
    let {vnode,render,props} = instance;

    if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT){
        return render.call(instance.proxy,instance.proxy)
    }else{
        return vnode.type(props); // 函数式组件
    }
}
```

### componentProps

```js
import { reactive } from "@vue/reactivity";
import { hasOwn, ShapeFlags } from "@vue/shared";

export function initProps(instance, rawProps) {
  const props = {};
  const attrs = {};

  const options = instance.propsOptions || {};

  if (rawProps) {
    for (let key in rawProps) {
      const value = rawProps[key];
      if (hasOwn(options, key)) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }
  }
  // 这里props不希望在组件内部被更改，但是props得是响应式的，因为后续属性变化了要更新视图， 用的应该是shallowReactive
  instance.props = reactive(props);
  instance.attrs = attrs;

  // props是组件中的，如果是函数式组件 应该用attrs作为props
  if (instance.vnode.shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT) {
    instance.props = instance.attrs;
  }
}
export const hasPropsChanged = (prevProps = {}, nextProps = {}) => {
  const nextKeys = Object.keys(nextProps);
  if (nextKeys.length !== Object.keys(prevProps).length) {
    return true;
  } // 比对属性前后 个数是否一致
  for (let i = 0; i < nextKeys.length; i++) {
    const key = nextKeys[i];
    if (nextProps[key] !== prevProps[key]) {
      return true;
    }
  } // 比对属性对应的值是否一致  {a:{xxx:xxx}} {a:{qqq:qq}}
  return false;
};

export function updateProps(prevProps, nextProps) {
  // 看一下属性有没有变化
  // 值的变化 ，属性的个数是否发生变化
  for (const key in nextProps) {
    prevProps[key] = nextProps[key];
  }
  for (const key in prevProps) {
    if (!hasOwn(nextProps, key)) {
      delete prevProps[key];
    }
  }
}
```

### defineAsyncComponent

```js
import { ref } from "@vue/reactivity";
import { h } from "./h";
import { Fragment } from "./vnode";

export function defineAsyncComponent(options) {
  if (typeof options === "function") {
    options = { loader: options };
  }
  // 如果已经组件出错了？ 但是真正的组件又加载出来了，要不要更新呢？
  return {
    setup() {
      const loaded = ref(false);
      const error = ref(false);
      const loading = ref(false);
      const {
        loader,
        timeout,
        errorComponent,
        delay,
        loadingComponent,
        onError,
      } = options;

      if (delay) {
        setTimeout(() => {
          loading.value = true; // 应该显示loading
        }, delay);
      }

      let Comp = null;

      function load() {
        return loader().catch((err) => {
          if (onError) {
            // 这里实现了一个promise链的递归
            return new Promise((resolve, reject) => {
              const retry = () => resolve(load());
              const fail = () => reject(err);
              onError(err, retry, fail);
            });
          }
        });
      }
      load()
        .then((c) => {
          Comp = c;
          loaded.value = true;
        })
        .catch((err) => (error.value = err))
        .finally(() => {
          loading.value = false;
        });

      setTimeout(() => {
        error.value = true;
      }, timeout);

      return () => {
        if (loaded.value) {
          // 正确组件的渲染
          return h(Comp);
        } else if (error.value && errorComponent) {
          return h(errorComponent); // 错误组件渲染
        } else if (loading.value && loadingComponent) {
          return h(loadingComponent); // 错误组件渲染
        }
        return h(Fragment, []); // 无意义渲染
      };
    },
  };
}
```

### h

```js
// h的用法 h('div')

import { isArray, isObject } from "@vue/shared";
import { createVnode, isVnode } from "./vnode";

// h('div',{style:{"color"：“red”}},'hello')
// h('div','hello')

// h('div',null,'hello','world')
// h('div',null,h('span'))
// h('div',null,[h('span')])

export function h(type, propsChildren?, children?) {
  // 其余的除了3个之外的肯定是孩子
  const l = arguments.length;
  // h('div',{style:{"color"：“red”}})
  // h('div',h('span'))
  // h('div',[h('span'),h('span')])
  // h('div','hello')
  if (l === 2) {
    // 为什么要将儿子包装成数组， 因为元素可以循环创建。 文本不需要包装了
    if (isObject(propsChildren) && !isArray(propsChildren)) {
      if (isVnode(propsChildren)) {
        // 虚拟节就包装成数组
        return createVnode(type, null, [propsChildren]);
      }
      return createVnode(type, propsChildren); // 属性
    } else {
      return createVnode(type, null, propsChildren); // 是数组
    }
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    } else if (l === 3 && isVnode(children)) {
      // h('div,{}',h('span'))
      // 等于3个
      children = [children];
    }
    // 其他
    return createVnode(type, propsChildren, children); // children的情况有两种 文本 / 数组
  }
}
```

### index

```js
export { createRenderer } from "./renderer";
export { h } from "./h";

export * from "./vnode";

export * from "@vue/reactivity";

export * from "./apiLifecycle";

export * from "./component";

export * from "./apiInject";

export { TeleportImpl as Teleport } from "./components/Teleport";
export { KeepAliveImpl as KeepAlive } from "./components/KeepAlive";

export * from "./defineAsyncComponent";
```

### renderer

```js
import { reactive } from "@vue/reactivity";
import { hasOwn, invokeArrayFns, isArray, isNumber, isString, PatchFlags, ShapeFlags } from "@vue/shared";
import { ReactiveEffect } from "@vue/reactivity";
import { getSequence } from "./sequence";
import { Text ,createVnode,isSameVnode,Fragment} from "./vnode";
import { queueJob } from "./scheduler";
import { hasPropsChanged, initProps, updateProps } from "./componentProps";
import { createComponentInstance, renderComponent, setupComponent } from "./component";
import { isKeepAlive } from "./components/KeepAlive";



export function createRenderer(renderOptions){
    let  {
    // 增加 删除 修改 查询
        insert:hostInsert,
        remove:hostRemove,
        setElementText:hostSetElementText,
        setText:hostSetText,
        parentNode:hostParentNode,
        nextSibling:hostNextSibling,
        createElement:hostCreateElement,
        createText:hostCreateText,
        patchProp:hostPatchProp
        // 文本节点 ， 元素中的内容
    } = renderOptions

    const normalize = (children,i)=>{
        if(isString(children[i]) || isNumber(children[i])){
            let vnode = createVnode(Text,null,children[i])
            children[i] = vnode;
        }
        return children[i];
    }
    const mountChildren = (children,container,parentComponent) =>{
        for(let i = 0; i < children.length;i++){
            let child = normalize(children,i); // 处理后要进行替换，否则childrne中存放的已经是字符串
            patch(null,child,container,parentComponent)
        }
    }
    const mountElement = (vnode,container,anchor,parentComponent)=>{
        let {type,props,children,shapeFlag} = vnode;
        let el = vnode.el = hostCreateElement(type); // 将真实元素挂载到这个虚拟节点上，后续用于复用节点和更新
        if(props){
            for(let key in props){
                hostPatchProp(el,key,null,props[key])
            }
        }
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN){ // 文本
            hostSetElementText(el,children)
        }else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){ // 数组
            mountChildren(children,el,parentComponent)
        }
        hostInsert(el,container,anchor)
    }

    const processText = (n1,n2,container)=>{
        if(n1 === null){
            hostInsert((n2.el = hostCreateText(n2.children)),container)
        }else{
            // 文本的内容变化了，我可以复用老的节点
            const el =  n2.el = n1.el;
            if(n1.children !== n2.children){
                hostSetText(el,n2.children); // 文本的更新
            }
        }
    }


    const patchProps = (oldProps,newProps,el)=>{
        for(let key in newProps){ // 新的里面有，直接用新的盖掉即可
            hostPatchProp(el,key,oldProps[key],newProps[key]);
        }
        for(let key in oldProps){ // 如果老的里面有新的没有，则是删除
            if(newProps[key] == null){
                hostPatchProp(el,key,oldProps[key],undefined);
            }
        }
    }
    const unmountChildren = (children,parentComponent) =>{
        for(let i = 0; i < children.length;i++){
            unmount(children[i],parentComponent);
        }
    }
    const patchKeyedChildren = (c1,c2,el,parentComponent) =>{ // 比较两个儿子的差异

        let i = 0;
        let e1 = c1.length-1;
        let e2 = c2.length - 1;

        // 特殊处理..................................................

        // sync from start
        while(i<=e1 && i<=e2){ // 有任何一方停止循环则直接跳出
            const n1 = c1[i];
            const n2 = c2[i];
            if(isSameVnode(n1,n2)){
                patch(n1,n2,el); // 这样做就是比较两个节点的属性和子节点
            }else{
                break;
            }
            i++
        }
        // sync from end
        while(i<=e1 && i<=e2){
            const n1 = c1[e1];
            const n2 = c2[e2];
            if(isSameVnode(n1,n2)){
                patch(n1,n2,el);
            }else{
                break;
            }
            e1--;
            e2--;
        }
        // common sequence + mount
        // i要比e1大说明有新增的
        // i和e2之间的是新增的部分

        // 有一方全部比较完毕了 ，要么就删除 ， 要么就添加
        if(i > e1){
            if(i<=e2){
                while(i <=e2){
                    const nextPos = e2 + 1;
                    // 根据下一个人的索引来看参照物
                    const anchor =nextPos < c2.length ?  c2[nextPos].el : null
                    patch(null,c2[i],el,anchor); // 创建新节点 扔到容器中
                    i++;
                }
            }
        }else if(i> e2){
            if(i<=e1){
                while(i<=e1){
                    unmount(c1[i],parentComponent)
                    i++;
                }
            }
        }
        // common sequence + unmount
        // i比e2大说明有要卸载的
        // i到e1之间的就是要卸载的

        // 优化完毕************************************
        // 乱序比对
        let s1 = i;
        let s2 = i;
        const keyToNewIndexMap = new Map(); // key -> newIndex
        for(let i = s2; i<=e2;i++){
            keyToNewIndexMap.set(c2[i].key,i)
        }


        // 循环老的元素 看一下新的里面有没有，如果有说明要比较差异，没有要添加到列表中，老的有新的没有要删除
        const toBePatched = e2 - s2 + 1; // 新的总个数
        const newIndexToOldIndexMap = new Array(toBePatched).fill(0); // 一个记录是否比对过的映射表



        for(let i = s1; i<=e1; i++){
            const oldChild = c1[i]; // 老的孩子
            let newIndex =  keyToNewIndexMap.get(oldChild.key); // 用老的孩子去新的里面找
            if(newIndex == undefined){
                unmount(oldChild,parentComponent); // 多余的删掉
            }else{
                // 新的位置对应的老的位置 , 如果数组里放的值>0说明 已经pactch过了
                newIndexToOldIndexMap[newIndex-s2] = i+1; // 用来标记当前所patch过的结果
                patch(oldChild,c2[newIndex],el)
            }
        } // 到这这是新老属性和儿子的比对，没有移动位置


         // 获取最长递增子序列
         let increment = getSequence(newIndexToOldIndexMap)

        // 需要移动位置
        let j = increment.length - 1;
        for(let i =toBePatched - 1; i>=0; i-- ){ // 3 2 1 0
            let index = i + s2;
            let current = c2[index]; // 找到h
            let anchor = index + 1 < c2.length ? c2[index+1].el : null;
            if(newIndexToOldIndexMap[i] === 0){ // 创建   [5 3 4 0]  -> [1,2]
                patch(null,current,el,anchor)
            }else{ // 不是0 说明是已经比对过属性和儿子的了
                if(i !=  increment[j] ){
                    hostInsert(current.el,el,anchor); // 目前无论如何都做了一遍倒叙插入，其实可以不用的， 可以根据刚才的数组来减少插入次数
                }else{
                    j--;
                }
            }
           // 这里发现缺失逻辑 我需要看一下current有没有el。如果没有el说明是新增的逻辑
           // 最长递增子序列来实现  vue2 在移动元素的时候会有浪费  优化
        }
    }
    const patchChildren = (n1,n2,el,parentComponent) =>{
        // 比较两个虚拟节点的儿子的差异 ， el就是当前的父节点
        const c1 = n1.children;
        const c2 = n2.children;
        const prevShapeFlag = n1.shapeFlag; // 之前的
        const shapeFlag = n2.shapeFlag; // 之后的
        // 文本  空的null  数组


        // 比较两个儿子列表的差异了
        // 新的 老的
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN){
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN){
                // 删除所有子节点
                unmountChildren(c1,parentComponent)  // 文本	数组	（删除老儿子，设置文本内容）
            }
            if(c1 !== c2){ // 文本	文本	（更新文本即可）  包括了文本和空
                hostSetElementText(el,c2)
            }
        }else{
            // 现在为数组或者为空
            if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN){
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){  // 数组	数组	（diff算法）
                    // diff算法
                    patchKeyedChildren(c1,c2,el,parentComponent); // 全量比对
                }else{
                    // 现在不是数组 （文本和空 删除以前的）
                    unmountChildren(c1,parentComponent); // 空	数组	（删除所有儿子）
                }
            }else{
                if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN){
                    hostSetElementText(el,'')   // 数组	文本	（清空文本，进行挂载）
                }   // 空	文本	（清空文本）
                if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
                    mountChildren(c2,el,parentComponent)   // 数组	文本	（清空文本，进行挂载）
                }
            }
        }
    }

    const patchBlockChildren = (n1,n2,parentComponent)=>{
        for(let i = 0 ; i <n2.dynamicChildren.length;i++ ){
            // 树的递归比较 ， 现在是数组的比较
            patchElement(n1.dynamicChildren[i],n2.dynamicChildren[i],parentComponent)
        }
    }
    const patchElement = (n1,n2,parentComponent) =>{ // 先复用节点、在比较属性、在比较儿子
        let el =  n2.el = n1.el;
        let oldProps = n1.props || {}; // 对象
        let newProps = n2.props || {}; // 对象
        let {patchFlag} = n2;
        if(patchFlag & PatchFlags.CLASS ){
            if(oldProps.class !== newProps.class){

                hostPatchProp(el,'class',null,newProps.class)
            }
            // style .. 事件
        }else{
            patchProps(oldProps,newProps,el);
        }
        // 这里的patchChildren是一个全量的diff算法

        if(n2.dynamicChildren){ // 元素之间的优化  靶向更新
            // 只比较了动态
            patchBlockChildren(n1,n2,parentComponent);
        }else{
            // h1 在这呢/
            patchChildren(n1,n2,el,parentComponent);
        }
    }


    const processElement = (n1,n2,container,anchor,parentComponent) => {
        if(n1 === null){
            mountElement(n2,container,anchor,parentComponent);
        }else{
            // 元素比对
           patchElement(n1,n2,parentComponent)
        }
    }
    const processFragment = (n1,n2,container,parentComponent) =>{
        if(n1 == null){
            mountChildren(n2.children,container,parentComponent)
        }else{
            patchChildren(n1,n2,container,parentComponent); // 走的是diff算法
        }
    }
     const mountComponent = (vnode,container,anchor,parentComponent) =>{
        // 1) 要创造一个组件的实例
        let instance = vnode.component = createComponentInstance(vnode,parentComponent);


        if(isKeepAlive(vnode)){
           ( instance.ctx as any).renderer = {
                createElement:hostCreateElement, // 创建元素用这个方法
                move(vnode,container){ // move的vnode肯定是组件
                    hostInsert(vnode.component.subTree.el,container)
                }
            }
        }


        // 2) 给实例上赋值
        setupComponent(instance);
        // 3) 创建一个effect
        setupRenderEffect(instance,container,anchor)
    }
    const updateComponentPreRender = (instance,next)=>{
        instance.next = null; // next清空
        instance.vnode = next; // 实例上最新的虚拟节点
        updateProps(instance.props,next.props);
        Object.assign(instance.slots,next.children)  // 更新插槽
    }

    const setupRenderEffect = (instance,container,anchor)=>{
        const {render,vnode} = instance;
        const componentUpdateFn = () =>{ // 区分是初始化 还是要更新
            if(!instance.isMounted){ // 初始化
                let {bm,m} = instance
                if(bm){
                    invokeArrayFns(bm)
                }
                const subTree = renderComponent(instance) // 作为this，后续this会改
                patch(null,subTree,container,anchor,instance); // 创造了subTree的真实节点并且插入了

                instance.subTree = subTree;
                instance.isMounted = true;

                if(m){ // 一定要保证 subTree已经有了 再去调用mounted
                    invokeArrayFns(m);
                }
            }else{ // 组件内部更新
                let {next,bu,u} = instance;

                if(next){
                    // 更新前 我也需要拿到最新的属性来进行更新
                    updateComponentPreRender(instance,next);
                }
                if(bu){
                    invokeArrayFns(bu);
                }
                const subTree = renderComponent(instance);
                patch(instance.subTree,subTree,container,anchor,instance);
                instance.subTree = subTree;


                if(u){
                    invokeArrayFns(u);
                }
            }
        }
        // 组件的异步更新
        const effect = new ReactiveEffect(componentUpdateFn,()=> queueJob(instance.update))
        // 我们将组件强制更新的逻辑保存到了组件的实例上，后续可以使用
        let update = instance.update = effect.run.bind(effect); // 调用effect.run可以让组件强制重新渲染
        update();
    }
    const shouldUpdateComponent = (n1,n2) =>{
         const {props:prevProps,children:prevChildren} = n1;
         const {props:nextProps,children:nextChildren} = n2;

         if(prevChildren || nextChildren) { // 有孩子一定要更新
              return true;
         }
         if(prevProps === nextProps) return false;
         return hasPropsChanged(prevProps,nextProps)
    }
    const updateComponent = (n1,n2) =>{
        // instance.props 是响应式的，而且可以更改  属性的更新会导致页面重新渲染
        const instance = (n2.component = n1.component); // 对于元素而言，复用的是dom节点，对于组件来说复用的是实例

        // 需要更新就强制调用组件的update方法
        if(shouldUpdateComponent(n1,n2)){
            instance.next = n2;// 将新的虚拟节点放到next属性上
            instance.update(); // 统一调用update方法来更新
        }


        // updateProps(instance,prevProps,nextProps); // 属性更新

    }
    const processComponent = (n1,n2,container,anchor,parentComponent) =>{ // 统一处理组件， 里面在区分是普通的还是 函数式组件
        if(n1 == null){ // my1-> my2 -> my1
            if(n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE){
                parentComponent.ctx.activate(n2,container,anchor)
            }else{
                mountComponent(n2,container,anchor,parentComponent);
            }
        }else{
            // 组件更新靠的是props
            updateComponent(n1,n2)
        }
    }
    const patch = (n1,n2,container,anchor = null,parentComponent = null) => { //  核心的patch方法
        if(n1 === n2) return;
        if(n1 && !isSameVnode(n1,n2)){ // 判断两个元素是否相同，不相同卸载在添加
            unmount(n1,parentComponent); // 删除老的
            n1 = null
        }
        const {type,shapeFlag} = n2
        switch(type){
            case Text:
                processText(n1,n2,container);
                break;
            case Fragment: // 无用的标签
                processFragment(n1,n2,container,parentComponent);
                break;
            default:
                if(shapeFlag & ShapeFlags.ELEMENT){
                    processElement(n1,n2,container,anchor,parentComponent);
                }else if(shapeFlag & ShapeFlags.COMPONENT){
                    // 文档只能在你会的时候看，不会的时候很难看懂
                    processComponent(n1,n2,container,anchor,parentComponent)
                }else if(shapeFlag & ShapeFlags.TELEPORT){
                    type.process(n1,n2,container,anchor,{
                        mountChildren,
                        patchChildren,
                        move(vnode,container){
                            hostInsert(vnode.component ? vnode.component.subTree.el : vnode.el,container)
                        }
                        // ...
                    })
                }
        }
    }
    const unmount = (vnode,parentComponent) =>{
        if(vnode.type == Fragment){ // fragment删除的时候 要清空儿子 不是删除真实dom
            return unmountChildren(vnode,parentComponent)
        }else if(vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE){
            return parentComponent.ctx.deactivate(vnode); // 直接把虚拟节点传递给你
        }else if(vnode.shapeFlag & ShapeFlags.COMPONENT){
            return unmount(vnode.component.subTree,null)
        }
        hostRemove(vnode.el); // el.removeChild()
    }
    // vnode 虚拟dom
    const render = (vnode,container) =>{ // 渲染过程是用你传入的renderOptions来渲染
        if(vnode == null){
            // 卸载逻辑
            if(container._vnode){ // 之前确实渲染过了，那么就卸载掉dom
                unmount(container._vnode,null); // el
            }
        }else{
            // 这里既有初始化的逻辑，又有更新的逻辑
            patch(container._vnode || null,vnode,container)
        }
        container._vnode = vnode
        // 如果当前vnode是空的话
    }
    return {
        render
    }
}
// 文本的处理, 需要自己增加类型。因为不能通过document.createElement('文本')
// 我们如果传入null的时候在渲染时，则是卸载逻辑，需要将dom节点删掉


// 1) 更新的逻辑思考：
// - 如果前后完全没关系，删除老的 添加新的
// - 老的和新的一样， 复用。 属性可能不一样， 在比对属性，更新属性
// - 比儿子
```

### scheduler

```js
let queue = [];
let isFlushing = false;
const resolvePromise = Promise.resolve();

export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job);
  }
  if (!isFlushing) {
    // 批处理逻辑
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      let copy = queue.slice(0);
      queue.length = 0;
      for (let i = 0; i < copy.length; i++) {
        let job = copy[i];
        job();
      }
      copy.length = 0;
    });
  }
}
```

### sequence

```js
export function getSequence(arr) {
  const len = arr.length;
  const result = [0]; // 以默认第0个为基准来做序列
  const p = new Array(len).fill(0); // 最后要标记索引 **放的东西不用关心，但是要和数组一样长**
  let start;
  let end;
  let middle;
  let resultLastIndex;
  for (let i = 0; i < len; i++) {
    let arrI = arr[i];
    if (arrI !== 0) {
      // 因为vue里面的序列中0 意味着没有意义需要创建
      resultLastIndex = result[result.length - 1];
      if (arr[resultLastIndex] < arrI) {
        // 比较最后一项和当前项的值，如果比最后一项大，则将当前索引放到结果集中
        result.push(i);

        p[i] = resultLastIndex; // 当前放到末尾的要记住他前面的那个人是谁
        continue;
      }
      // 这里我们需要通过二分查找，在结果集中找到比当前值大的，用当前值的索引将其替换掉
      // 递增序列 采用二分查找 是最快的
      start = 0;
      end = result.length - 1;
      while (start < end) {
        // start === end的时候就停止了  .. 这个二分查找在找索引
        middle = ((start + end) / 2) | 0;
        // 1 2 3 4 middle 6 7 8 9   6
        if (arr[result[middle]] < arrI) {
          start = middle + 1;
        } else {
          end = middle;
        }
      }
      // 找到中间值后，我们需要做替换操作  start / end
      if (arr[result[end]] > arrI) {
        // 这里用当前这一项 替换掉以有的比当前大的那一项。 更有潜力的我需要他
        result[end] = i;
        p[i] = result[end - 1]; // 记住他的前一个人是谁
      }
    }
  }
  // 1) 默认追加
  // 2) 替换
  // 3) 记录每个人的前驱节点
  // 通过最后一项进行回溯
  let i = result.length;
  let last = result[i - 1]; // 找到最后一项了
  while (i-- > 0) {
    // 倒叙追溯
    result[i] = last; // 最后一项是确定的
    last = p[last];
  }
  return result;
}
```

### vnode

```js
// type  props  children

import {
  isArray,
  isFunction,
  isObject,
  isString,
  ShapeFlags,
} from "@vue/shared";
import { isTeleport } from "./components/Teleport";
export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");
export function isVnode(value) {
  return !!(value && value.__v_isVnode);
}
export function isSameVnode(n1, n2) {
  // 判断两个虚拟节点是否是相同节点，套路是1）标签名相同 2） key是一样的
  return n1.type === n2.type && n1.key === n2.key;
}
// 虚拟节点有很多：组件的、元素的、文本的   h('h1')
export function createVnode(type, props, children = null, patchFlag = 0) {
  // 组合方案 shapeFlag  我想知道一个元素中包含的是多个儿子还是一个儿子  标识
  let shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isTeleport(type)
    ? ShapeFlags.TELEPORT // 针对不同的类型增添shapeFlag
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0;
  // 虚拟dom就是一个对象，diff算法。 真实dom的属性比较多
  const vnode = {
    // key
    type,
    props,
    children,
    el: null, // 虚拟节点上对应的真实节点，后续diff算法
    key: props?.["key"],
    __v_isVnode: true,
    shapeFlag,
    patchFlag,
  };
  if (children) {
    let type = 0;
    if (isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN;
    } else if (isObject(children)) {
      type = ShapeFlags.SLOTS_CHILDREN; // 这个组件是带有插槽的
    } else {
      children = String(children);
      type = ShapeFlags.TEXT_CHILDREN;
    }
    vnode.shapeFlag |= type;
  }

  if (currentBlock && vnode.patchFlag > 0) {
    currentBlock.push(vnode);
  }
  return vnode;
}

export { createVnode as createElementVNode };
let currentBlock = null;

export function openBlock() {
  // 用一个数组来收集多个动态节点
  currentBlock = [];
}
export function createElementBlock(type, props, children, patchFlag) {
  return setupBlock(createVnode(type, props, children, patchFlag));
}

function setupBlock(vnode) {
  vnode.dynamicChildren = currentBlock;
  currentBlock = null;
  return vnode;
}
// export function _createElementVNode(){

// }
export function toDisplayString(val) {
  return isString(val)
    ? val
    : val == null
    ? ""
    : isObject(val)
    ? JSON.stringify(val)
    : String(val);
}
```
