### koa 源
###### application
```js
const context = require('./context');
const request = require('./request');
const response = require('./response');
// 我们希望每个应用应该是独立的，不是a放了属性，b受影响 （实现应用之间的隔离）
const http = require('http');
const EventEmitter = require('events')
class Application extends EventEmitter {
    constructor() {
        super();
        this.context = Object.create(context); // 每次都是基于这个对象创建一个全新的上下文
        this.request = Object.create(request);
        this.response = Object.create(response)
        this.middlewares = []
    }
    use(fn) {
        this.middlewares.push(fn)
    }
    createContext(req, res) {
        const ctx = Object.create(this.context);
        const request = Object.create(this.request);
        const response = Object.create(this.response);

        request.response = response;
        response.request = request
        ctx.request = request; // 扩展的
        ctx.response = response
        ctx.req = ctx.request.req = ctx.response.req = req; // 原生的
        ctx.res = ctx.response.res = ctx.request.res = res;

        ctx.app = this;
        return ctx;
    }
    compose(ctx) {
        let middlewares = this.middlewares
        let idx = -1;
        function dispatch(i) {
            // 没有中间件直接成功
            if (i <= idx) return Promise.reject(new Error('next() call multiple times'))
            if (i === middlewares.length) return Promise.resolve()
            let fn = middlewares[i];
            idx = i
            //  我们将用户的函数包装了promise
            // 而且是一个链式的调用
            try {
                // 可能用户提供的是一个普通的函数，此时没办法通过promise 来进行捕获，所以要直接try catch
                return Promise.resolve(fn(ctx, () => dispatch(i + 1)))
            } catch (err) {
                return Promise.reject(err)
            }
        }
        return dispatch(0)
    }
    handleRequest = (req, res) => {
        // 每次请求都是独立的， 不会出现 不同的请求 复用属性
        const ctx = this.createContext(req, res)

        res.statusCode = 404;

        this.compose(ctx).then(() => {
            let body = ctx.body;
            if (typeof body === 'string' || Buffer.isBuffer(body)) {
                res.end(body)
            } else {
                res.end('Not Found')
            }
        }).catch(err => {
            this.emit('error', err)
        })

    }
    listen(...args) {
        const server = http.createServer(this.handleRequest);

        server.listen(...args)
    }
}
module.exports = Application
```
###### context
```js
const context = {
    // get path() {
    //     return this.request.path
    // },
    // get query() {
    //     return this.request.query
    // },
}
function defineGetter(target, key) {
    // Object.defineProperty.get 方法
    context.__defineGetter__(key, function () {
        return this[target][key]
    })
}

function defineSetter(target, key) {
    // Object.defineProperty.get 方法
    context.__defineSetter__(key, function (value) {
        this[target][key] = value
    })
}

// ctx.path -> ctx.request.path
defineGetter('request', 'path')
defineGetter('request', 'query')
defineGetter('request', 'header')
defineGetter('request', 'headers')

// // ctx.body -> ctx.response.body
defineGetter('response', 'body')
// ctx.body = 123 => ctx.response.body = 123
defineSetter('response', 'body')
module.exports = context
```
###### request
```js
const url = require('url')

const request = {
    get path() {
        // req?
        return url.parse(this.req.url).pathname
    },
    get query() {
        return url.parse(this.req.url, true).query
    },
    get header() {
        return this.req.headers

    },
    get headers() {
        return this.req.headers
    }
}
// ctx.req
// ctx.request.req
/* ctx.request = {
    xxx(){
        this = ctx.request
        this.req = req
    }
}
ctx.request.xxx
*/
module.exports = request
```
###### response
```js
const response = {
    set body(value) {
        this.res.statusCode = 200;
        if (value == null) {
            this.res.statusCode = 204;
        }
        this._body = value;
    },
    get body() {
        return this._body
    }
}

module.exports = response
```
### 应用
```js
const Koa = require('./koa');
const app = new Koa();

// koa中会将所有的 函数串联成一个promise （每一个函数都是一个promiose） 最外层的promise执行完毕就结束了

// 1) 这里每个use中的方法都是promise, 这些promise会被组合成一个promise， 如果外层的promise没有等待里层的，则直接就结束了
// 2) 所有的异步逻辑都要写成promise
// 3) 所有next方法前面 必须+ return 或者 await
function sleep(timer) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, timer)
    })
}
app.use(async function (ctx, next) {
    // console.log(1)
    // ctx.body = 'ok1';
    await next(); // 这里没有等待下一个函数执行完毕 只是调用了一下而已
    // console.log(2)
});
app.use(async function (ctx, next) {
    console.log(3)
    ctx.body = 'ok2'
    await sleep(1000)
    return next()
});
app.use(async function (ctx, next) {
    console.log(5)
    ctx.body = 'ok3'
    await next()
    console.log(6)
});
app.on('error', function (err) {
    console.log(err, '-----')
})

app.listen(3000, function () {
    console.log(`server start 3000`)
}); // http.createServer().listen()


// 1） 特点1: 实现对req和res的封装
// 2） 特点2: 洋葱模型
```