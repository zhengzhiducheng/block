### 事件环
``` js

// 进程和线程的区别?
// 进程： 计算机是以进程来分配任务和调度任务 （进程间通信 ipc ）
// 进程中包含着线程

// 浏览器是由多个进程组成的  （每个页签都是一个独立的进程） 
// 浏览器中主要的进程有：主进程  网络进程、绘图的进程、 插件都是一个个的进程

// 一个页签都是一个进程 （渲染进程）： 渲染的线程

// 渲染进程中 ：  进程中包含的线程 
// ui线程 负责页面渲染、布局、绘制
// js线程：js引擎线程， 主要负责执行js代码的 （ui线程  js线程互斥的，js也是单线程的） 为了保证渲的一致性要保证整个执行是单线程的
// 主线程：单线程的 （代码是从上大下执行） webworker(不能操作dom元素) 同步代码

// 定时器、请求、用户的事件操作 都是异步的 （每次开一个定时器 都会生成一个新的线程）

// 异步任务的划分 ： 宏任务、微任务
// 微任务： Promise.then(ECMAScript里面提供的)  mutationObserver(html5,这里的回调是一异步执行的) queueMircrotask
// 宏任务：默认的script脚本  ui渲染也是一个宏任务  setTimout, 请求，用户的事件、messageChannel, setImmediate

// requestIDleCallback  requestFrameAnimation  (这个是放在渲染的) 只能算回调，你可以当成宏任务


// 宏任务队列（消息队列 底层是由多个队列组成 , 我们实际看的宏任务队列当成一个来理解）  时间到达后会将任务放到宏任务队列中 webApi
// 微任务队列 每次执行宏任务的时候 都会产生一个微任务队列 ， 我们在看执行过程的时候当成只有一个来理解  微任务就是个回调
// 代码执行的过程中
// 宏任务和微任务  会将对应的结果放到不同的队列中 
// 等待当前宏任务执行完毕后，会将微任务全部清空 (在微任务执行的过程中 如果在产生微任务 则会将当前产生的微任务放到队列尾部 )
// 微任务都执行完毕后，会在宏任务队列中拿出来一个执行  （宏任务每次执行一个，微任务每次执行一堆）

// js 是单线程的所以要有一个事件触发线程 来实现任务的调度
// 宏任务的执行顺序 是按照 调用的顺序 （时间一样的情况下）， 如果时间不一样，则以放入的顺序为准
// 渲染是要在特定的时机才能渲染， 根据浏览器的刷新频率 16.6ms, 不是每一轮都要渲染的 （一定在微任务之后）
 Promise.resolve().then(()=>{
    console.log('ok1')
    Promise.resolve().then(()=>{
        console.log('ok2')
        Promise.resolve().then(()=>{
            console.log('ok3')
        })
    })
})


```
### MutationObserver
``` html
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
    <script>
      const targetNode = document.getElementById("app");

      // 观察器的配置（需要观察什么变动）
      const config = { attributes: true, childList: true, subtree: true };

      // 当观察到变动时执行的回调函数
      const callback = function (mutationsList, observer) {
        // Use traditional 'for loops' for IE 11
        console.log('callback')
      };

      // 创建一个观察器实例并传入回调函数
      const observer = new MutationObserver(callback);

      // 以上述配置开始观察目标节点
      observer.observe(targetNode, config);

      // 之后，可停止观察

      targetNode.appendChild(document.createElement('p'));
      console.log('ok')
    </script>
  </body>
</html>

```