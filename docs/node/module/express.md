# 源码 路由 index
```js
const url = require("url");
const Layer = require("./layer");
const Route = require("./route");
const methods = require("methods");
// 如果一个类 返回一个对象 ，那么会用这个对象作为实例
function Router() {
    let router = (req, res, next) => {
        // 中间件函数
        router.handle(req, res, next);
    };
    router.stack = [];
    // 我自己创造一个对象 可以获取到原始的功能
    router.__proto__ = proto;
    router.paramsCallbacks = {};
    return router;
}
let proto = {};
// 只有路由layer 才会有route属性，中间件不具备route属性
proto.use = function (path, ...handlers) {
    if (typeof path !== "string") {
        handlers.unshift(path);
        path = "/";
    }
    handlers.forEach((handler) => {
        this.stack.push(new Layer(path, handler));
    });
};
proto.param = function (key, callback) {
    let callbacks = this.paramsCallbacks[key] || [];

    callbacks.push(callback);
    // 将属性和方法订阅到 paramsCallbacks 中
    this.paramsCallbacks[key] = callbacks;
};
methods.forEach((method) => {
    proto[method] = function (path, handlers) {
        if (!Array.isArray(handlers)) {
            handlers = Array.from(arguments).slice(1);
        }
        // 1) 给每个路由增加route属性
        const route = new Route(); // route中要存储用户的真实回调
        route[method](handlers);
        // 2) 每次调用路由的时候都会产生一层
        const layer = new Layer(path, route.dispatch.bind(route));
        layer.route = route; // 路由中每个层都有一个route属性

        // 3）最终将这一层放到路由系统中
        this.stack.push(layer);
    };
});
proto.handle_params = function (req, res, layer, callback) {
    const paramsCallbacks = this.paramsCallbacks;
    const keys = layer.keys.map((item) => item.name);

    let idx = 0;
    let key;
    let fns;
    // {username:[fn,fn],password:[fn]}
    const next = () => {
        if (keys.length === idx) return callback(); // 参数都处理完毕，则进行最终响应
        key = keys[idx++]; // username
        fns = paramsCallbacks[key]; // [fn]
        if (fns && fns.length) {
            processCallback();
        } else {
            next();
        }
    };
    let i = 0;
    const processCallback = () => {
        // [fn,fn] -> next
        let fn = fns[i++];
        if (fn) {
            fn(req, res, processCallback, layer.params[key], key);
        } else {
            i = 0;
            next(); // username 回调处理完毕后 ，在处理 password
        }
    };
    next();

    if (!keys.length) {
        return callback();
    }
};
proto.handle = function (req, res, out) {
    const { pathname: requestPathname } = url.parse(req.url);
    const requestMethod = req.method.toLowerCase();

    // 在外层先匹配路径
    let idx = 0;

    let removed = "";
    const next = (err) => {
        if (idx === this.stack.length) return out(req, res);
        let layer = this.stack[idx++];

        // 2.从上一个next到下一个next 就表示出来了

        if (removed.length > 0) {
            req.url = removed + req.url;
            removed = "";
        }

        if (err) {
            // 跳过路由和普通的中间件，找错误处理中间件
            if (!layer.route) {
                if (layer.handler.length === 4) {
                    // 如果参数是四个则是错误处理中间件，将错误信息传递过去
                    layer.handle_error(err, req, res, next);
                } else {
                    // 普通的中间件
                    next(err);
                }
            } else {
                // 是路由
                next(err);
            }
        } else {
            // 无论是中间件还是路由要求路径都要匹配，路由需要匹配方法
            if (layer.match(requestPathname)) {
                // layer.params = 解析后的结果
                if (!layer.route) {
                    // 中间件
                    if (layer.handler.length === 4) {
                        next(); // 正常情况下不执行错误处理中间件
                    } else {
                        // 1.进入到中间件里的时候 需要去除中间件的路径
                        removed = layer.path === "/" ? "" : layer.path;
                        //  /add
                        req.url = req.url.slice(removed.length);
                        layer.handle_request(req, res, next);
                    }
                } else {
                    if (layer.route.methods[requestMethod]) {
                        req.params = layer.params;
                        // 等待我们将参数处理完毕后，在处理真正的响应逻辑
                        this.handle_params(req, res, layer, () => {
                            // 这里就是真正的响应逻辑
                            layer.handle_request(req, res, next);
                        });
                    } else {
                        next();
                    }
                }
            } else {
                next();
            }
        }
    };

    next();
};
module.exports = Router;

// 路由系统 router

```
### layer
```js
const pathToRegExp = require('path-to-regexp')
function Layer(path, handler) {
    this.path = path;
    this.handler = handler;
    this.regExp = pathToRegExp(this.path, (this.keys = []), { strict: true });
}
Layer.prototype.match = function (pathname) {
    if (this.path === pathname) {
        return true
    }
    let matches = pathname.match(this.regExp);
    if (matches) {
        let params = this.keys.reduce((matchObj, current, index) => (matchObj[current.name] = matches[index + 1], matchObj), {})
        this.params = params
        return true;
    }

    if (!this.route) {
        if (this.path === '/') {
            return true;
        }
        return pathname.startsWith(this.path + '/')
    }
    return false
}
Layer.prototype.handle_request = function (req, res, next) {
    this.handler(req, res, next)
}
Layer.prototype.handle_error = function (err, req, res, next) {
    this.handler(err, req, res, next)
}
module.exports = Layer
```
### route
```js
const Layer = require("./layer")
const methods = require('methods')

// 每次调用路由的时候 都会产生一个route ， 存放着用户的回调，需要提供一个dispatch方法
function Route() {
    this.stack = []
    this.methods = {}; // 用来标识当前route中存放了哪些方法
}
methods.forEach(method => {
    Route.prototype[method] = function (handlers) {
        handlers.forEach(handler => {
            const layer = new Layer('不要路径', handler)
            layer.method = method;
            this.methods[method] = true
            this.stack.push(layer);
        })
    }
})
Route.prototype.dispatch = function (req, res, out) { // 这个会被存放到外层的layer上
    let idx = 0
    const next = (err) => {
        if (err) return out(err)
        if (idx === this.stack.length) return out();
        let layer = this.stack[idx++];
        const requestMethod = req.method.toLowerCase();
        if (layer.method == requestMethod) {
            layer.handle_request(req, res, next)
        } else {
            next();
        }
    }
    next()
}

module.exports = Route
```
# application
```js
const Router = require('./router')
const http = require('http');
const methods = require('methods');
const init = require('../middleware/init')
function Application() { // 每个应用都配置一个独立的路由系统
}
Application.prototype.lazy_route = function () {
    if (!this.router) {
        this.router = new Router();
        this.use(init()); // 默认就注入一个init插件
    }
}
methods.forEach(method => {
    Application.prototype[method] = function (path, ...handlers) {
        // this.routes.push({
        //     path,
        //     method: 'get',
        //     handler
        // })
        this.lazy_route();
        this.router[method](path, handlers)
    }
})
Application.prototype.use = function () {
    this.lazy_route();
    // 交给路由系统来进行处理
    this.router.use(...arguments)
}
Application.prototype.param = function () {
    this.lazy_route();
    // 交给路由系统来进行处理
    this.router.param(...arguments)
}
Application.prototype.listen = function (...args) {
    this.lazy_route();
    // 找不到就调用此done方法 结束应用
    function done(req, res) {
        res.end(`Cannot my ${req.method} ${req.url}`)
    }
    const server = http.createServer((req, res) => {
        // 去请求里找到对应的方法和路径，到路由系统中进行匹配
        this.router.handle(req, res, done)
    });
    server.listen(...args)
}
module.exports = Application

// 应用app
```
# express
```js


const Application = require('./application')
const Router = require('./router')
// 1) 创建应用 
// 2) 路由系统
// 3) 应用本身
function createApplication() {
    return new Application()
}
createApplication.Router = Router
module.exports = createApplication


// express 本身
```