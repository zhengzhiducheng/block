# 源码

## history

### store

```js
import { forEachValue } from "./utils";
import { reactive } from "vue";
import { storeKey } from "./injectKey";
export default class Store {
  constructor(options) {
    // vuex3 内部会创造一个vue的实例 ，但是 vuex4 直接采用vue3 提供的响应式方法
    const store = this;
    // store._state.data
    store._state = reactive({ data: options.state }); // new Vue
    // vuex 里面有一个比较中的api  replaceState

    const _getters = options.getters; // {double:function  => getter}

    store.getters = {};
    forEachValue(_getters, function (fn, key) {
      Object.defineProperty(store.getters, key, {
        enumerable: true,
        get: () => fn(store.state), // computed,很遗憾 在vuex中不能用computed实现  如果组件销毁了会移除计算属性 ， vue3.2 会改掉这个bug
      });
    });

    store._mutations = Object.create(null);
    store._actions = Object.create(null);
    const _mutations = options.mutations;
    const _actions = options.actions;
    forEachValue(_mutations, (mutation, key) => {
      store._mutations[key] = (payload) => {
        mutation.call(store, store.state, payload);
      };
    });
    forEachValue(_actions, (action, key) => {
      store._actions[key] = (payload) => {
        action.call(store, store, payload);
      };
    });
  }
  commit = (type, payload) => {
    // bind 方法
    this._mutations[type](payload);
  };
  dispatch = (type, payload) => {
    this._actions[type](payload);
  };
  get state() {
    // 类的属性访问器
    return this._state.data;
  }
  install(app, injectKey) {
    // createApp().use(store,'my')
    // 全局暴露一个变量 暴露的是store的实例
    app.provide(injectKey || storeKey, this); // 给根app增加一个_provides ,子组件会去向上查找
    // Vue.prototype.$store = this
    app.config.globalProperties.$store = this; // 增添$store属性
  }
}
```

## module

### module-collection

```js
import { forEachValue } from "../utils";
import Module from "./module";
export default class ModuleCollection {
  constructor(rootModule) {
    this.root = null;
    this.register(rootModule, []); // root => a b  a=>c
  }
  register(rawModule, path) {
    const newModule = new Module(rawModule);
    // rawModule.newModule = newModule; // 把新的模块 添加到原始对象上
    if (path.length == 0) {
      // 是一个根模块
      this.root = newModule;
    } else {
      const parent = path.slice(0, -1).reduce((module, current) => {
        return module.getChild(current);
      }, this.root);
      parent.addChild(path[path.length - 1], newModule);
    }
    if (rawModule.modules) {
      forEachValue(rawModule.modules, (rawChildModule, key) => {
        this.register(rawChildModule, path.concat(key));
      });
    }
    return newModule;
  }
  getNamespaced(path) {
    let module = this.root; // [a,c] a/c
    return path.reduce((namespaceStr, key) => {
      module = module.getChild(key); // 子模块
      return namespaceStr + (module.namespaced ? key + "/" : "");
    }, "");
  }
}
```

### module

```js
import { forEachValue } from "../utils";
export default class Module {
  constructor(rawModule) {
    this._raw = rawModule;
    this._children = {};
    this.state = rawModule.state;
    this.namespaced = rawModule.namespaced; // 自己是否有命名空间
  }
  // 方便扩展
  addChild(key, module) {
    this._children[key] = module;
  }
  getChild(key) {
    return this._children[key];
  }
  forEachChild(fn) {
    forEachValue(this._children, fn);
  }
  forEachGetter(fn) {
    if (this._raw.getters) {
      forEachValue(this._raw.getters, fn);
    }
  }
  forEachMutation(fn) {
    if (this._raw.mutations) {
      forEachValue(this._raw.mutations, fn);
    }
  }
  forEachAction(fn) {
    if (this._raw.actions) {
      forEachValue(this._raw.actions, fn);
    }
  }
}
```

### index

```js
import { inject, reactive } from "vue";
import { useStore } from "./injectKey";
import Store from "./store";
// 创建容器 返回一个store

function createStore(options) {
  return new Store(options);
}

export { useStore, createStore };
```

### injectKey

```js
export const storeKey = "store";
import { inject } from "vue";
// vue 内部已经将这个些api导出来了
export function useStore(injectKey = null) {
  return inject(injectKey !== null ? injectKey : storeKey);
}
```

### store

```js
import { forEachValue, isPromise } from "./utils";
import { reactive, watch } from "vue";
import { storeKey } from "./injectKey";
import ModuleCollection from "./module/module-collection";

function getNestedState(state, path) {
  // 根据路径 获取store.上面的最新状态
  return path.reduce((state, key) => state[key], state);
}

// 后续我们会将store.state 用reactive包裹
function installModule(store, rootState, path, module) {
  // 递归安装
  let isRoot = !path.length; // 如果数组是空数组 说明是根，否则不是

  const namespaced = store._modules.getNamespaced(path); // [a,c]

  if (!isRoot) {
    // []
    let parentState = path
      .slice(0, -1)
      .reduce((state, key) => state[key], rootState);
    store._withCommit(() => {
      parentState[path[path.length - 1]] = module.state;
    });
  }
  // getters  module._raw.getters

  module.forEachGetter((getter, key) => {
    // {double:function(state){}}
    store._wrappedGetters[namespaced + key] = () => {
      return getter(getNestedState(store.state, path)); // 如果直接使用模块上自己的状态，此状态不是响应式的
    };
  });
  // mutation   {add:[mutation]}
  module.forEachMutation((mutation, key) => {
    const entry =
      store._mutations[namespaced + key] ||
      (store._mutations[namespaced + key] = []);
    entry.push((payload) => {
      // store.commit('add',payload)
      mutation.call(store, getNestedState(store.state, path), payload);
    });
  });
  // actions  mutation和action的一个区别， action执行后返回一个是promise
  module.forEachAction((action, key) => {
    const entry =
      store._actions[namespaced + key] ||
      (store._actions[namespaced + key] = []);
    entry.push((payload) => {
      // store.dispatch('LOGIN',payload).then(()=>{})
      let res = action.call(store, store, payload);
      // res 是不是一个promise
      if (!isPromise(res)) {
        return Promise.resolve(res);
      }
      return res;
    });
  });

  module.forEachChild((child, key) => {
    // aCount,bCount
    installModule(store, rootState, path.concat(key), child);
  });
}

function resetStoreState(store, state) {
  store._state = reactive({ data: state }); // store._state.data = 'xxcx'
  const wrappedGetters = store._wrappedGetters;
  store.getters = {};
  forEachValue(wrappedGetters, (getter, key) => {
    Object.defineProperty(store.getters, key, {
      get: getter,
      enumerable: true,
    });
  });
  if (store.strict) {
    enableStrictMode(store);
  }
}
// mutation 和 action的区别？
function enableStrictMode(store) {
  watch(
    () => store._state.data,
    () => {
      // 监控数据变变化，数据变化后执行回调函数  effect
      console.assert(
        store._commiting,
        "do not mutate vuex store state outside mutation handlers"
      );
    },
    { deep: true, flush: "sync" }
  ); // 默认watchApi是异步的，这里改成同步的监控
}
export default class Store {
  _withCommit(fn) {
    // 切片
    const commiting = this._commiting;
    this._commiting = true;
    fn();
    this._commiting = commiting;
  }
  constructor(options) {
    // {state,actions,mutations,getter,modules}
    const store = this;
    store._modules = new ModuleCollection(options);
    // {add:[fn,fn,fn]}  发布订阅模式
    store._wrappedGetters = Object.create(null);
    store._mutations = Object.create(null);
    store._actions = Object.create(null);

    this.strict = options.strict || false; // 是不是严格模式

    // 调用的时候 知道是mutation，mutation里面得写同步代码
    this._commiting = false;

    // 在mutation之前添加一个状态 _commiting = true;
    // 调用mutation -> 会更改状态 ， 我就监控这个状态，如果当前状态变化的时候_commiting = true, 同步更改
    // _commiting = false

    // 定义状态
    const state = store._modules.root.state; // 根状态
    installModule(store, state, [], store._modules.root);
    resetStoreState(store, state);
    // console.log(store, state);

    // 把状态定义到 store.state.aCount.cCount.count;

    store._subscribes = [];
    options.plugins.forEach((plugin) => plugin(store));
  }
  subscribe(fn) {
    this._subscribes.push(fn);
  }
  get state() {
    return this._state.data;
  }
  replaceState(newState) {
    // 严格模式下 不能直接修改状态
    this._withCommit(() => {
      this._state.data = newState;
    });
  }
  commit = (type, payload) => {
    const entry = this._mutations[type] || [];
    this._withCommit(() => {
      entry.forEach((handler) => handler(payload));
    });
    this._subscribes.forEach((sub) => sub({ type, payload }, this.state));
  };
  dispatch = (type, payload) => {
    const entry = this._actions[type] || [];
    return Promise.all(entry.map((handler) => handler(payload)));
  };
  install(app, injectKey) {
    // createApp().use(store,'my')
    // 全局暴露一个变量 暴露的是store的实例
    app.provide(injectKey || storeKey, this); // 给根app增加一个_provides ,子组件会去向上查找
    // Vue.prototype.$store = this
    app.config.globalProperties.$store = this; // 增添$store属性
  }
  registerModule(path, rawModule) {
    // issue  aCount/bCount
    const store = this;
    if (typeof path == "string") path = [path];

    // 要在原有的模块基础上新增加一个
    const newModule = store._modules.register(rawModule, path); // 注册上去
    // 在把模块安装上

    installModule(store, store.state, path, newModule);
    // 重置容器

    resetStoreState(store, store.state);
  }
}

// 格式化用户的参数，实现根据自己的需要，后续使用时方便

// root = {
//     _raw:rootModule,
//     state:rootModule.state, // 用户管理
//     _children:{
//         aCount:{ // > 1
//             _raw:aModule,
//             state:aModule.state,
//             _children:{ // > 1
//                 cCount:{
//                     _raw:useCssModule,
//                     state:cModule.state,
//                     _children:{}
//                 }
//             }
//         },
//         bCount:{
//             _raw:bModule,
//             state:bModule.state,
//             _children:{}
//         }
//     }
// }
```

### utils

```js
export function forEachValue(obj, fn) {
  Object.keys(obj).forEach((key) => fn(obj[key], key));
}
export function isPromise(val) {
  return val && typeof val.then === "function";
}
```
