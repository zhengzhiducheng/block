### 高阶函数解决异步
``` js
// 文件读取
const fs = require("fs"); // 文件系统模块 filesystem
const path = require("path"); // 路径模块 进行路径操作

// fs.readFile()  默认path.resolve() 会根据执行的路径来解析绝对路径
// node中的异步api 回调的第一个参数 都是err-first



// function cb(key,value){
//     obj[key] = value;
//     if(Reflect.ownKeys(obj).length === 2){
//         console.log(obj)
//     }
// }
function after(times,cb){
    let obj = {}
    return function (key,value){
        obj[key]= value;
        if(--times == 0){
            cb(obj)
        }
    }
}
let cb = after(2,(data)=>{ // 只有在两次完成后后 才能得到结果，但是无法监控中间的过程 （发布订阅）
    console.log(data)
})
fs.readFile(path.resolve(__dirname, "a.txt"), "utf-8", function (err,data) {
    cb('msg',data);
});


fs.readFile(path.resolve(__dirname, "b.txt"), "utf-8", function (err,data) {
    cb('age',data);
});


// 例如前端 并发ajax ，我们需要等待多个异步请求都完成后 将结果拿到渲染页面
// 同步 异步回调的执行结果


// 异步方法 在处理错误的情况时  必须通过回调的参数来处理
```
### 发布订阅
``` js
// 发布 （触发功能） & 订阅（订阅一些功能）

const fs = require("fs"); // 文件系统模块 filesystem
const path = require("path"); // 路径模块 进行路径操作


let events = {
    _obj:{},
    _arr:[], // 订阅中心，将所有的事，都订阅到数组中
    on(callback){
        this._arr.push(callback);
    },
    emit(key,value){ // 事情发生后，来依次触发回调
        this._obj[key] = value;

        this._arr.forEach(cb=> cb(this._obj))

    }
}


// 可以订阅多个
events.on(()=>{ // 监控每次触发的逻辑
    console.log('读取完毕后机会触发')
})

events.on((data)=>{ // 监控所有数据读取完毕
    if(Reflect.ownKeys(data).length === 2){
        console.log('数据全部读取完毕',data)
    }
})
fs.readFile(path.resolve(__dirname, "a.txt"), "utf-8", function (err,data) {
    events.emit('msg',data);
});


fs.readFile(path.resolve(__dirname, "b.txt"), "utf-8", function (err,data) {
    events.emit('age',data);
});

/// 通过发布订阅来实现解耦合， 灵活，但是触发是需要用户自己触发的

// 观察者模式是基于发布订阅模式的  我们数据变化后可以自动通知触发发布 （vue 响应式原理）
```
### 观察者
``` js

class Subject { // 被观察者
    constructor(name){
        this.name = name
        this._arr = [];
        this.state = '很开心的'
    }
    attach(o){
        this._arr.push(o); // 订阅
    }
    setState(newState){
        this.state = newState;
        // 宝宝状态变化了 会通知观察者更新，将自己传入过去
        this._arr.forEach((o)=>o.update(this)); // 发布
    }
}
class Observer { // 观察者
    constructor(name){
        this.name = name
    }
    update(s){
        console.log(this.name + ':' + s.name +s.state)
    }

}
let o1 = new Observer('爸爸')
let o2 = new Observer('妈妈')

let s = new Subject('宝宝'); // 创建一个被观察者
s.attach(o1) // 订阅
s.attach(o2)


s.setState('有人打我了')


//  发布订阅 用户要手动订阅 手动发布
// 观察者模式 是基于发布订阅的，主动的。 状态变化 主动通知

```