### 1.provide-inject 使用

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
    <!-- <script src="../../../node_modules/@vue/runtime-dom/dist/runtime-dom.global.js"></script> -->
    <!-- <script src="../../../node_modules/@vue/runtime-core/dist//runtime-core.global.js"></script>  -->
    <script src="./runtime-dom.global.js"></script>
    <script>
      let {
        createRenderer,
        h,
        render,
        Text,
        Fragment,
        ref,
        computed,
        onBeforeMount,
        onMounted,
        onBeforeUpdate,
        onUpdated,
        reactive,
        toRefs,
        getCurrentInstance,
        createElementVNode: _createElementVNode,
        toDisplayString: _toDisplayString,
        openBlock: _openBlock,
        createElementBlock: _createElementBlock,
        provide,
        inject,
      } = VueRuntimeDOM;

      // provide 和 inject就是为了实现跨级通信， 在我们组件库中，想跨级通信 那么就采用provide/inject

      // 如何实现的呢？ 使用的情况只能是 父 -》 子 -》 孙子 -》 曾孙
      // 实现原理是在父组件上增加了一个provies属性， 当调用privde时候会像属性中存值
      // 在渲染子组件的时候 子会将父的provides 放到自己的身上
      // 所有的compositionAPI都要以setup为入口
      // provide 和 inject只能在setup中使用
      const My = {
        setup() {
          let state = inject("VueComponent"); // 这里只是注入进来用
          let age = inject("age", 13);
          let instance = getCurrentInstance();
          return {
            state,
            age,
          };
        },
        render() {
          return h("h1", this.state.name + this.age);
        },
      };
      const VueComponent = {
        name: "parent",
        setup() {
          const state = reactive({ name: "zf" });
          provide("VueComponent", state);
          provide("my", "456");
          setTimeout(() => (state.name = "jw"), 1000);
        },
        render() {
          return h(My);
        },
      };
      render(h(VueComponent), app);
    </script>
  </body>
</html>
```

### 2.teleport 使用

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
    <div id="root"></div>
    <div id="abc"></div>
    <!-- <script src="../../../node_modules/@vue/runtime-dom/dist/runtime-dom.global.js"></script> -->
    <!-- <script src="../../../node_modules/@vue/runtime-core/dist//runtime-core.global.js"></script>  -->
    <script src="./runtime-dom.global.js"></script>
    <script>
      let {
        createRenderer,
        h,
        render,
        Text,
        Fragment,
        ref,
        computed,
        onBeforeMount,
        onMounted,
        onBeforeUpdate,
        onUpdated,
        reactive,
        toRefs,
        getCurrentInstance,
        createElementVNode: _createElementVNode,
        toDisplayString: _toDisplayString,
        openBlock: _openBlock,
        createElementBlock: _createElementBlock,
        provide,
        inject,
        Teleport,
      } = VueRuntimeDOM;

      const VueComponent = {
        setup() {
          const flag = ref(true);
          const handleClick = () => {
            flag.value = false;
          };
          return {
            flag,
            handleClick,
          };
        },
        render() {
          return h(
            "button",
            { onClick: this.handleClick },
            this.flag
              ? h(Teleport, { to: "#root" }, [h(Text, 4456)])
              : h(Teleport, { to: "#abc" }, [h(Text, 123), h(Text, 789)])
          );
        },
      };
      render(h(VueComponent), app);
    </script>
  </body>
</html>
```

### 3.asyncComponent 使用

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
    <div id="root"></div>
    <div id="abc"></div>
    <!-- <script src="../../../node_modules/@vue/runtime-dom/dist/runtime-dom.global.js"></script> -->
    <!-- <script src="../../../node_modules/@vue/runtime-core/dist//runtime-core.global.js"></script>  -->
    <script src="./runtime-dom.global.js"></script>
    <script>
      let {
        createRenderer,
        h,
        render,
        Text,
        Fragment,
        ref,
        computed,
        onBeforeMount,
        onMounted,
        onBeforeUpdate,
        onUpdated,
        reactive,
        toRefs,
        getCurrentInstance,
        createElementVNode: _createElementVNode,
        toDisplayString: _toDisplayString,
        openBlock: _openBlock,
        createElementBlock: _createElementBlock,
        provide,
        inject,
        Teleport,
        defineAsyncComponent,
      } = VueRuntimeDOM;

      // 异步组件就是刚开始渲染一个空组件， 稍后组件加载完毕后渲染一个真的组件

      // 对象的写法可以提供更丰富的操作  （组件加载失败， loading标识）
      // 函数写法

      // 图片懒加载，
      const My = {
        render: () => h("h1", "hello world"),
      };
      const ErrorComponent = {
        render: () => h("a", "组件超时了"),
      };
      const LoadingComponent = {
        render: () => h("h1", "loading...."),
      };
      // let asyncComponent = defineAsyncComponent(()=>{
      //     return new Promise((resolve,reject)=>{
      //         setTimeout(()=>{
      //             resolve(My);
      //         },2000)
      //     })
      // })

      let asyncComponent = defineAsyncComponent({
        loader: () => {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(My); // 我们正常情况下 加载失败一次之后 应该再次尝试重新加载
            }, 2000);
          });
        },
        timeout: 2000,
        delay: 1000,
        loadingComponent: LoadingComponent,
        errorComponent: ErrorComponent,
        onError(err, retry, fail) {
          console.log("加载失败重试");
          retry();
        },
      });
      render(h(asyncComponent), app);
    </script>
  </body>
</html>
```

### 4.functional 使用

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
    <div id="root"></div>
    <div id="abc"></div>
    <script src="../../../node_modules/@vue/runtime-dom/dist/runtime-dom.global.js"></script>
    <!-- <script src="../../../node_modules/@vue/runtime-core/dist//runtime-core.global.js"></script>  -->
    <!-- <script src="./runtime-dom.global.js"></script> -->
    <script>
      let {
        createRenderer,
        h,
        render,
        Text,
        Fragment,
        ref,
        computed,
        onBeforeMount,
        onMounted,
        onBeforeUpdate,
        onUpdated,
        reactive,
        toRefs,
        getCurrentInstance,
        createElementVNode: _createElementVNode,
        toDisplayString: _toDisplayString,
        openBlock: _openBlock,
        createElementBlock: _createElementBlock,
        provide,
        inject,
        Teleport,
        defineAsyncComponent,
      } = VueRuntimeDOM;
      // 直接返回虚拟点， 只用于接收数据并且渲染
      let functionalComponent = (props) => {
        // 就是函数 props 就是用户传递的属性
        return h("div", props.name);
      };
      render(h(functionalComponent, { name: "zf" }), app);
    </script>
  </body>
</html>
```

### 5.keep-alive 使用

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
    <div id="root"></div>
    <div id="abc"></div>
    <script src="../../../node_modules/@vue/runtime-dom/dist/runtime-dom.global.js"></script>
    <!-- <script src="../../../node_modules/@vue/runtime-core/dist//runtime-core.global.js"></script>  -->
    <!-- <script src="./runtime-dom.global.js"></script> -->
    <script>
      let {
        createRenderer,
        h,
        render,
        Text,
        Fragment,
        ref,
        computed,
        onBeforeMount,
        onMounted,
        onBeforeUpdate,
        onUpdated,
        reactive,
        toRefs,
        getCurrentInstance,
        createElementVNode: _createElementVNode,
        toDisplayString: _toDisplayString,
        openBlock: _openBlock,
        createElementBlock: _createElementBlock,
        provide,
        inject,
        Teleport,
        defineAsyncComponent,
        KeepAlive,
      } = VueRuntimeDOM;
      // component :is=""
      // 路由切换 router-view   缓存的功能，没有其他的特殊含义
      // 这里keep-alive他的整个实现原理的比较简单 （1） 如何缓存的 缓存的就是虚拟dom，真实dom）
      const My3 = {
        setup() {
          onMounted(() => {
            console.log("my3 mounted");
          });
        },
        render: () => {
          return h("h1", "my3");
        },
      };
      const My1 = {
        setup() {
          onMounted(() => {
            console.log("my1 mounted");
          });
        },
        render: () => {
          return h("h1", "my1");
        },
      };
      const My2 = {
        setup() {
          onMounted(() => {
            console.log("my2 mounted");
          });
        },
        render: () => h("h1", "my2"),
      };
      render(
        h(
          KeepAlive,
          { max: 1 },
          {
            default: () => h(My1),
          }
        ),
        app
      );
      setTimeout(() => {
        render(
          h(
            KeepAlive,
            { max: 1 },
            {
              default: () => h(My2),
            }
          ),
          app
        );
      }, 1000);
      setTimeout(() => {
        render(
          h(
            KeepAlive,
            { max: 1 },
            {
              default: () => h(My3),
            }
          ),
          app
        );
      }, 2000);

      setTimeout(() => {
        render(
          h(
            KeepAlive,
            { max: 1 },
            {
              default: () => h(My1),
            }
          ),
          app
        );
      }, 3000);

      setTimeout(() => {
        render(
          h(
            KeepAlive,
            { max: 1 },
            {
              default: () => h(My3),
            }
          ),
          app
        );
      }, 4000);
      setTimeout(() => {
        render(
          h(
            KeepAlive,
            { max: 1 },
            {
              default: () => h(My3),
            }
          ),
          app
        );
      }, 5000);
      //   my1  -> my3
      // my2 -> my3   LRU算法
    </script>
  </body>
</html>
```

### modules

###### attr

```js
export function patchAttr(el, key, nextValue) {
  if (nextValue) {
    el.setAttribute(key, nextValue);
  } else {
    el.removeAttribute(key);
  }
}
```

###### class

```js
export function patchClass(el, nextValue) {
  if (nextValue == null) {
    el.removeAttribute("class"); // 如果不需要class直接移除
  } else {
    el.className = nextValue;
  }
}
```

###### event

```js
function createInvoker(callback) {
  const invoker = (e) => invoker.value(e);
  invoker.value = callback;
  return invoker;
}

// 第一次绑定了onClick事件 "a"    el._vei = {click:onClick}  el.addEventListener(click,(e) => a(e); )
// 第二次绑定了onClick事件 "b"    el._vei = {click:onClick}  el.addEventListener(click,(e) => b(e); )
// 第三次绑定了onClick事件  null el.removeEventListener(click,(e) => b(e); )  el._vei ={}
export function patchEvent(el, eventName, nextValue) {
  // 事件绑定都缓存到了当前dom上
  // 可以先移除掉事件 在重新绑定事件
  // remove -> add  === > add + 自定义事件 （里面调用绑定的方法）
  let invokers = el._vei || (el._vei = {});
  let exits = invokers[eventName]; // 先看有没有缓存过
  // 如果绑定的是一个空
  if (exits && nextValue) {
    // 已经绑定过事件了
    exits.value = nextValue; // 没有卸载函数 只是改了invoker.value 属性
  } else {
    // onClick = click
    let event = eventName.slice(2).toLowerCase();
    if (nextValue) {
      const invoker = (invokers[eventName] = createInvoker(nextValue));
      el.addEventListener(event, invoker);
    } else if (exits) {
      // 如果有老值，需要将老的绑定事件移除掉
      el.removeEventListener(event, exits);
      invokers[eventName] = undefined;
    }
  }
}
```

###### style

```js
export function patchStyle(el, prevValue, nextValue = {}) {
  // 样式需要比对差异
  for (let key in nextValue) {
    // 用新的直接覆盖即可
    el.style[key] = nextValue[key];
  }
  if (prevValue) {
    for (let key in prevValue) {
      if (nextValue[key] == null) {
        el.style[key] = null;
      }
    }
  }
}
```

### index

```js
import { createRenderer } from "@vue/runtime-core";
import { nodeOps } from "./nodeOps";
import { patchProp } from "./patchProp";

const renderOptions = Object.assign(nodeOps, { patchProp }); // domAPI 属性api

export function render(vnode, container) {
  // 在创建渲染器的时候 传入选项
  createRenderer(renderOptions).render(vnode, container);
}

export * from "@vue/runtime-core";
```

### nodeOps

```js
export const nodeOps = {
  // 增加 删除 修改 查询
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor); // insertBefore 可以等价于appendChild
  },
  remove(child) {
    // 删除节点
    const parentNode = child.parentNode;
    if (parentNode) {
      parentNode.removeChild(child);
    }
  },
  setElementText(el, text) {
    el.textContent = text;
  },
  setText(node, text) {
    // document.createTextNode()
    node.nodeValue = text;
  },
  querySelector(selector) {
    return document.querySelector(selector);
  },
  parentNode(node) {
    return node.parentNode;
  },
  nextSibling(node) {
    return node.nextSibling;
  },
  createElement(tagName) {
    return document.createElement(tagName);
  },
  createText(text) {
    return document.createTextNode(text);
  },
  // 文本节点 ， 元素中的内容
};
```

### patchProp

```js
// dom属性的操作api

import { patchAttr } from "./modules/attr";
import { patchClass } from "./modules/class";
import { patchEvent } from "./modules/event";
import { patchStyle } from "./modules/style";

// null , 值
// 值   值
// 值   null
export function patchProp(el, key, prevValue, nextValue) {
  // 类名  el.className
  if (key === "class") {
    patchClass(el, nextValue);
    // el  style {color:'red',fontSzie:'12'}  {color:'blue',background:"red"}
  } else if (key === "style") {
    // 样式  el.style
    patchStyle(el, prevValue, nextValue);
  } else if (/^on[^a-z]/.test(key)) {
    // events  addEventListener
    patchEvent(el, key, nextValue);
  } else {
    // 普通属性 // el.setAttribute
    patchAttr(el, key, nextValue);
  }
}

// for(let key in obj){
//     patchProp(el,key,null,obj[key])
// }
```
