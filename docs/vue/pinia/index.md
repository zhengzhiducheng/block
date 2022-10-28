### 入口 mian.js

```js
import { createApp } from "vue";
import App from "./App.vue";

// import { createPinia } from 'pinia';
import { createPinia } from "@/pinia";

const app = createApp(App);

const pinia = createPinia();

pinia.use(function ({ store }) {
  let local = localStorage.getItem("STATE");
  if (local) {
    store.$state = JSON.parse(local);
  }
  store.$subscribe((mutation, state) => {
    localStorage.setItem("STATE", JSON.stringify(state));
  });
});

app.use(pinia); // plugin.install 方法

app.mount("#app");

// render(h(App),'#app')

// vuex 缺点：ts兼容性不好   命名空间的缺陷（只能有一个store）    mutation和action的区别

// pinia 优点：ts兼容性好    不需要命名空间（可以创建多个store）  mutation删掉了  （状态、计算属性、动作）
// 大小也会更小巧一些
```

### 组件使用

```vue
<script>
import { useCounterStore } from "./stores/counter";
import { mapActions, mapState, mapWritableState } from "@/pinia";
export default {
  computed: {
    ...mapWritableState(useCounterStore, ["count"]), // optionsAPI  => {count:'count'} mapHelpers
    ...mapWritableState(useCounterStore, { f: "fruits" }),
    ...mapWritableState(useCounterStore, ["doubleCount"]),
  },
  methods: {
    ...mapActions(useCounterStore, ["increment"]),
  },
};
</script>

<template>
  <!-- const store = reactive({}) -->
  计数器:{{ count }} <br />
  水果:{{ f }} <br />

  {{ doubleCount }}

  <button @click="count++">点击</button>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
```
