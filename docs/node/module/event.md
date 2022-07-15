### node中自己实现的发布订阅模块,订阅是将方法对应成一种一对多的关系，on方法用来订阅事件
```js
function EventEmitter(){
    this._events = Object.create(null);
}
EventEmitter.prototype.on = function(eventName,callback){
    if(!this._events) this._events = Object.create(null);

    // 如果用户绑定的不是newListener 让newListener的回调函数执行
    if(eventName !== 'newListener'){
        if(this._events['newListener']){
            this._events['newListener'].forEach(fn=>fn(eventName))
        }
    }
    if(this._events[eventName]){
            this._events[eventName].push(callback)
        }else{
            this._events[eventName] = [callback]; // {newListener:[fn1]}
    }
}
```
### off方法可以移除对应的事件监听
```js
// 移除绑定的事件
EventEmitter.prototype.off = function(eventName,callback){
    if(this._events[eventName]){
        this._events[eventName] = this._events[eventName].filter(fn=>{
            return fn!=callback && fn.l !== callback
        });
    }
}
```
### emit用来执行订阅的事件
```js
EventEmitter.prototype.emit = function(eventName,...args){
    if(this._events[eventName]){
        this._events[eventName].forEach(fn => {
            fn.call(this,...args);
        });
    }
}
```
### once绑定事件当执行后自动删除订阅的事件
```js
EventEmitter.prototype.once = function(eventName,callback){
    let one = (...args)=>{
        callback.call(this,...args);
        // 删除掉这个函数
        this.off(eventName,one); // 执行完后在删除掉
    }
    one.l = callback; // one.l = fn;
    // 先绑定一个once函数，等待emit触发完后执行one函数 ，执行原有的逻辑，执行后删除once函数
    this.on(eventName,one);
}
```