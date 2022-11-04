### router

###### index.js

```js
import {
  createRouter,
  createWebHistory,
  createWebHashHistory,
} from "@/vue-router";
import Home from "../views/Home.vue";
import About from "../views/About.vue";
const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
    children: [
      { path: "a", component: { render: () => <h1>a页面</h1> } }, // jsx 语法
      { path: "b", component: { render: () => <h1>b页面</h1> } },
    ],
    beforeEnter(to, from, next) {
      console.log("before enter", to);
    },
  },
  {
    path: "/about",
    name: "About",
    component: About,
  },
];
const router = createRouter({
  // mode
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("beforeEach1", to);
      resolve();
    }, 1000);
  });
});
router.beforeEach((to, from, next) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("beforeEach2", to);
      resolve();
    }, 1000);
  });
});
router.beforeEach((to, from, next) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("beforeEach3", to);
      resolve();
    }, 1000);
  });
});
router.beforeResolve((to, from, next) => {
  console.log("beforeResove", to);
});
router.afterEach((to, from, next) => {
  console.log("afterEach", to);
});
export default router;
```
