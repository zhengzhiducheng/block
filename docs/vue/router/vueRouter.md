# history

### hash

```js
import { createWebHistory } from "./html5";

export function createWebHashHistory() {
  return createWebHistory("#");
}
```

### html5

```js
function buildState(
  back,
  current,
  forward,
  replace = false,
  computedScroll = false
) {
  return {
    back,
    current,
    forward,
    replace,
    scroll: computedScroll
      ? { left: window.pageXOffset, top: window.pageYOffset }
      : null,
    position: window.history.length - 1,
  };
}

function createCurrentLocation(base) {
  const { pathname, search, hash } = window.location;

  const hasPos = base.indexOf("#"); // 就是hash  / /about ->  #/ #/about
  if (hasPos > -1) {
    return base.slice(1) || "/";
  }
  return pathname + search + hash;
}

function useHistoryStateNavigation(base) {
  const currentLocation = {
    value: createCurrentLocation(base),
  };
  const historyState = {
    value: window.history.state,
  };
  // 第一次刷新页面 此时没有任何状态，那么我就自己维护一个状态 （后退后是哪个路径、当前路径是哪个、要去哪里，我是用的push跳转还是replace跳转，跳转后滚动条位置是哪）
  if (!historyState.value) {
    changeLocation(
      currentLocation.value,
      buildState(null, currentLocation.value, null, true),
      true
    );
  }

  function changeLocation(to, state, replace) {
    const hasPos = base.indexOf("#");
    const url = hasPos > -1 ? base + to : to;
    window.history[replace ? "replaceState" : "pushState"](state, null, url);
    historyState.value = state; // 将自己生成的状态同步到了 路由系统中了
  }

  function push(to, data) {
    // 去哪，带的新的状态是谁？
    // 跳转的时候 我需要做两个状态 一个是跳转前 从哪去哪
    const currentState = Object.assign(
      {},
      historyState.value, // 当前的状态
      {
        forward: to,
        scroll: { left: window.pageXOffset, top: window.pageYOffset },
      }
    );
    // 本质是没有跳转的 只是更新了状态，后续在vue中我可以详细监控到状态的变化
    changeLocation(currentState.current, currentState, true);
    const state = Object.assign(
      {},
      buildState(currentLocation.value, to, null),
      { position: currentState.position + 1 },
      data
    );
    changeLocation(to, state, false); // 真正的更改路径
    currentLocation.value = to;
    // 跳转后 从这到了那
  }

  function replace(to, data) {
    const state = Object.assign(
      {},
      buildState(historyState.value.back, to, historyState.value.forward, true),
      data
    );
    changeLocation(to, state, true);
    currentLocation.value = to; // 替换后需要将路径变为现在的路径
  }
  return {
    location: currentLocation,
    state: historyState,
    push,
    replace,
  };
}
// 前进后退的时候 要更新historyState 和 currentLocation这两个边路
function useHistoryListeners(base, historyState, currentLocation) {
  let listeners = [];
  const popStateHandler = ({ state }) => {
    // 最新的状态，已经前进后退完毕后的状态
    const to = createCurrentLocation(base); // 去哪
    const from = currentLocation.value; // 从哪来
    const fromState = historyState.value; // 从哪来的状态

    currentLocation.value = to;
    historyState.value = state; // state 可能会为null

    let isBack = state.position - fromState.position < 0;

    // 用户在这扩展.....
    listeners.forEach((listener) => {
      listener(to, from, { isBack });
    });
  };

  window.addEventListener("popstate", popStateHandler); // 只能监听浏览器的前进厚涂
  function listen(cb) {
    listeners.push(cb);
  }
  return {
    listen,
  };
}
export function createWebHistory(base = "") {
  // 1.路由系统最基本的 得包含当前的路径，当前路径下他的状态是什么, 需要提供两个切换路径的方法 push replace
  const historyNavigation = useHistoryStateNavigation(base);

  const historyListeners = useHistoryListeners(
    base,
    historyNavigation.state,
    historyNavigation.location
  );

  const routerHistory = Object.assign({}, historyNavigation, historyListeners);

  Object.defineProperty(routerHistory, "location", {
    // 代理模式
    get: () => historyNavigation.location.value,
  });
  Object.defineProperty(routerHistory, "state", {
    get: () => historyNavigation.state.value,
  });
  return routerHistory;

  // routerHistory.location 代表当前的路径
  // routerHistory.state 代表当前的状态
  // push / replace 切换路径和状态

  // listen 可以接受用户的一个回调，当用户前进后退时可以触发此方法
}
```

# matcher

### index

```js
function normalizeRouteRecord(record) {
  // 格式化用户的参数
  return {
    path: record.path, // 状态机 解析路径的分数，算出匹配规则
    meta: record.meta || {},
    beforeEnter: record.beforeEnter,
    name: record.name,
    components: {
      // a? b?
      default: record.component, // 循环
    },
    children: record.children || [],
  };
}

function createRouteRecordMatcher(record, parent) {
  // 创造匹配记录 ，构建父子关系
  // record 中的path 做一些修改 正则的情况
  const matcher = {
    path: record.path,
    record,
    parent,
    children: [],
  };
  if (parent) {
    parent.children.push(matcher);
  }
  return matcher;
}
// 树的遍历
function createRouterMatcher(routes) {
  const matchers = [];
  function addRoute(route, parent) {
    let normalizedRecord = normalizeRouteRecord(route);
    if (parent) {
      normalizedRecord.path = parent.path + normalizedRecord.path;
    }
    const matcher = createRouteRecordMatcher(normalizedRecord, parent);
    if ("children" in normalizedRecord) {
      let children = normalizedRecord.children;
      for (let i = 0; i < children.length; i++) {
        addRoute(children[i], matcher);
      }
    }
    matchers.push(matcher);
  }
  routes.forEach((route) => addRoute(route));
  function resolve(location) {
    // {path:/,matched:HomeRecord} {path:/a,matched:[HomeRecord,aRecord]}
    const matched = []; // /a
    let path = location.path;
    let matcher = matchers.find((m) => m.path == path);
    while (matcher) {
      matched.unshift(matcher.record); // 将用户的原始数据 放到matched中
      matcher = matcher.parent;
    }
    return {
      path,
      matched,
    };
  }
  return {
    resolve,
    addRoute, // 动态的添加路由， 面试问路由 如何动态添加 就是这个api
  };
}

export { createRouterMatcher };
```

# index

```js
import { createWebHashHistory } from "./history/hash";
import { createWebHistory } from "./history/html5";
import { ref, shallowRef, computed, reactive, unref } from "vue";
import { RouterLink } from "./router-link";
import { RouterView } from "./router-view";
import { createRouterMatcher } from "./matcher";
// 数据处理 options.routes 是用户的配置 ， 难理解不好维护

// /  =>  record {Home}
// /a =>  record {A,parent:Home}
// /b => record {B,parent:Home}
// /about=>record

const START_LOCATION_NORMALIZED = {
  // 初始化路由系统中的默认参数
  path: "/",
  // params:{}, // 路径参数
  // query:{},
  matched: [], // 当前路径匹配到的记录
};

function useCallback() {
  const handlers = [];

  function add(handler) {
    handlers.push(handler);
  }
  return {
    add,
    list: () => handlers,
  };
}

function extractChangeRecords(to, from) {
  const leavingRecords = [];
  const updatingRecords = [];
  const enteringRecords = [];
  const len = Math.max(to.matched.length, from.matched.length);

  for (let i = 0; i < len; i++) {
    const recordFrom = from.matched[i];
    if (recordFrom) {
      // /a   [home,A]  /b [home,B]
      // 去的和来的都有 那么就是要更新
      if (to.matched.find((record) => record.path == recordFrom.path)) {
        updatingRecords.push(recordFrom);
      } else {
        leavingRecords.push(recordFrom);
      }
    }
    const recrodTo = to.matched[i];
    if (recrodTo) {
      if (!from.matched.find((record) => record.path === recrodTo.path)) {
        enteringRecords.push(recrodTo);
      }
    }
  }
  return [leavingRecords, updatingRecords, enteringRecords];
}

function guardToPromise(guard, to, from, record) {
  return () =>
    new Promise((resolve, reject) => {
      const next = () => resolve();
      let guardReturn = guard.call(record, to, from, next);
      // 如果不调用next最终也会调用next， 用户可以不调用next方法
      return Promise.resolve(guardReturn).then(next);
    });
}
function extractComponentsGuards(matched, guradType, to, from) {
  // guradType beforeRouteLeave
  const guards = [];
  for (const record of matched) {
    let rawComponent = record.components.default;
    const guard = rawComponent[guradType];
    // 我需要将钩子 全部串联在一起？  promise
    guard && guards.push(guardToPromise(guard, to, from, record));
  }
  return guards;
}
// promise的组合函数
function runGuardQueue(guards) {
  // []
  return guards.reduce(
    (promise, guard) => promise.then(() => guard()),
    Promise.resolve()
  );
}

function createRouter(options) {
  const routerHistory = options.history;

  const matcher = createRouterMatcher(options.routes); // 格式化路由的配置 拍平

  // 后续改变这个数据的value 就可以更新视图了
  const currentRoute = shallowRef(START_LOCATION_NORMALIZED);

  const beforeGuards = useCallback();
  const beforeResolveGuards = useCallback();
  const afterGuards = useCallback();

  // vue2 中有两个属性 $router 里面包含的时方法  $route 里面包含的属性

  // 将数据用计算属性 再次包裹
  function resolve(to) {
    // to="/"   to={path:'/'}
    if (typeof to === "string") {
      return matcher.resolve({ path: to });
    }
  }
  let ready;

  function markAsReady() {
    if (ready) return;
    ready = true; // 用来标记已经渲染完毕了
    routerHistory.listen((to) => {
      const targetLocation = resolve(to);
      const from = currentRoute.value;
      finalizeNavigation(targetLocation, from, true); // 在切换前进后退 是 替换模式不是push模式
    });
  }

  function finalizeNavigation(to, from, replaced) {
    if (from === START_LOCATION_NORMALIZED || replaced) {
      routerHistory.replace(to.path);
    } else {
      routerHistory.push(to.path);
    }
    currentRoute.value = to; // 更新最新的路径

    console.log(currentRoute.value);
    markAsReady();
    // 如果是初始化 我们还需要注入一个listen 去更新currentRoute的值，这样数据变化后可以重新渲染视图
  }

  async function navigate(to, from) {
    // 在做导航的时候 我要知道哪个组件是进入，哪个组件是离开的，还要知道哪个组件是更新的

    const [leavingRecords, updatingRecords, enteringRecords] =
      extractChangeRecords(to, from);

    // 我离开的时候 需要从后往前   /home/a  -> about

    let guards = extractComponentsGuards(
      leavingRecords.reverse(),
      "beforeRouteLeave",
      to,
      from
    );
    return runGuardQueue(guards)
      .then(() => {
        guards = [];
        for (const guard of beforeGuards.list()) {
          guards.push(guardToPromise(guard, to, from, guard));
        }
        return runGuardQueue(guards);
      })
      .then(() => {
        guards = extractComponentsGuards(
          updatingRecords,
          "beforeRouteUpdate",
          to,
          from
        );
        return runGuardQueue(guards);
      })
      .then(() => {
        guards = [];
        for (const record of to.matched) {
          if (record.beforeEnter) {
            guards.push(guardToPromise(record.beforeEnter, to, from, record));
          }
        }
        return runGuardQueue(guards);
      })
      .then(() => {
        guards = extractComponentsGuards(
          enteringRecords,
          "beforeRouteEnter",
          to,
          from
        );
        return runGuardQueue(guards);
      })
      .then(() => {
        guards = [];
        for (const guard of beforeResolveGuards.list()) {
          guards.push(guardToPromise(guard, to, from, guard));
        }
        return runGuardQueue(guards);
      });
  }

  function pushWithRedirect(to) {
    // 通过路径匹配到对应的记录，更新currentRoute
    const targetLocation = resolve(to);
    const from = currentRoute.value;
    // 路由的钩子 在跳转前我们可以做路由的拦截

    // 路由的导航守卫 有几种呢？ 全局钩子 路由钩子 组件上的钩子
    navigate(targetLocation, from)
      .then(() => {
        return finalizeNavigation(targetLocation, from);
      })
      .then(() => {
        // 当导航切换完毕后执行 afterEach
        for (const guard of afterGuards.list()) guard(to, from);
      });

    // 根据是不是第一次，来决定是 push 还是replace
  }

  function push(to) {
    return pushWithRedirect(to);
  }
  // reactive computed
  const router = {
    push,
    beforeEach: beforeGuards.add, // 可以注册多个 所以是一个发布订阅模式
    afterEach: afterGuards.add,
    beforeResolve: beforeResolveGuards.add,
    install(app) {
      // 路由的核心就是 页面切换 ，重新渲染
      const router = this;
      app.config.globalProperties.$router = router; // 方法
      Object.defineProperty(app.config.globalProperties, "$route", {
        // 属性
        enumerable: true,
        get: () => unref(currentRoute),
      });
      const reactiveRoute = {};
      for (let key in START_LOCATION_NORMALIZED) {
        //
        reactiveRoute[key] = computed(() => currentRoute.value[key]);
      }

      // vuex const store = useStore()
      app.provide("router", router); // 暴露路由对象
      app.provide("route location", reactive(reactiveRoute)); // 用于实现useApi
      // let router = useRouter(); // inject('router')

      // let route = useRoute();// inject('route location')

      app.component("RouterLink", RouterLink);
      app.component("RouterView", RouterView);

      if (currentRoute.value == START_LOCATION_NORMALIZED) {
        // 默认就是初始化, 需要通过路由系统先进行一次跳转 发生匹配
        push(routerHistory.location);
      }

      // 后续还有逻辑
      // 解析路径 ， RouterLink RouterView 实现， 页面的钩子 从离开到进入 到解析完成
    },
  };
  return router;
}

export { createWebHashHistory, createWebHistory, createRouter };
```

# router-link

```js
import { h, inject } from "vue";

function useLink(props) {
  const router = inject("router");
  function navigate() {
    router.push(props.to);
  }
  return {
    navigate,
  };
}
export const RouterLink = {
  name: "RouterLink",
  props: {
    to: {
      type: [String, Object],
      required: true,
    },
  },
  setup(props, { slots }) {
    const link = useLink(props);
    return () => {
      return h(
        "a",
        {
          // 虚拟节点 -》 真实节点
          onClick: link.navigate,
        },
        slots.default && slots.default()
      );
    };
  },
};
```

# router-view

```js
import { h, inject, provide, computed } from "vue";
export const RouterView = {
  name: "RouterView",
  // props:{
  //     name:
  // }
  setup(props, { slots }) {
    // 只会执行一次
    const depth = inject("depth", 0);
    const injectRoute = inject("route location");
    const matchedRouteRef = computed(() => injectRoute.matched[depth]);
    provide("depth", depth + 1);

    return () => {
      // /a  [home,a]
      const matchRoute = matchedRouteRef.value; // record
      const viewComponent = matchRoute && matchRoute.components.default;

      if (!viewComponent) {
        return slots.default && slots.default();
      }
      return h(viewComponent);
    };
  },
};
```
