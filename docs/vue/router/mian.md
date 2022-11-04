### mian

```js
import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

// use(router) => router.install(app);
createApp(App).use(router).mount("#app");
```
