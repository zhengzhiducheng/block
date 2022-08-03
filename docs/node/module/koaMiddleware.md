### bodyparser
```js
const querystring = require('querystring');
const uuid = require('uuid');
const fs = require('fs')
const path = require('path')
Buffer.prototype.split = function (boundary) {
    let arr = [];
    let offset = 0; // 偏移量
    let currentBondaryPosition = 0;
    while (-1 !== (currentBondaryPosition = this.indexOf(boundary, offset))) {
        arr.push(this.slice(offset, currentBondaryPosition));
        offset = currentBondaryPosition + boundary.length;
    }
    arr.push(this.slice(offset))
    return arr;
};
function bodyparser({ uploadDir }) { // koa的中间价的写法 就是执行返回一个中间价函数
    return async (ctx, next) => {
        function parserBody(body, resolve) {
            const contentType = ctx.get('Content-Type');
            if (contentType === 'application/x-www-form-urlencoded') {
                body = querystring.parse(body.toString())
            } else if (contentType === 'application/json') {
                body = JSON.parse(body.toString())
            } else {
                if (contentType.includes('multipart/form-data')) {
                    let boundary = '--' + contentType.split('=')[1];
                    let lines = body.split(boundary).slice(1, -1);
                    body = {};
                    lines.forEach(lineBuffer => {
                        let [head, content] = lineBuffer.split('\r\n\r\n');
                        let key = head.toString().match(/name="(.+?)"/)[1];
                        if (!head.includes('filename')) {

                            body[key] = content.toString().slice(0, -2);
                        } else {
                            let content = lineBuffer.slice(head.length + 4, -2);
                            if (!content.length) {
                                return
                            }
                            let filename = uuid.v4();
                            fs.writeFileSync(path.join(uploadDir, filename), content)
                            body[key] = {
                                originName: head.toString().match(/filename="(.+?)"/)[1],
                                filename: path.join(uploadDir, filename),
                                size: content.length
                            }
                        }
                    });
                }
            }
            resolve(body)
        }



        // 我在koa的上下的request对象上增加了一个属性
        ctx.request.body = await new Promise((resolve, reject) => {
            let arr = []
            ctx.req.on('data', function (chunk) {
                arr.push(chunk);
            })
            ctx.req.on('end', function () {
                let body = Buffer.concat(arr)
                parserBody(body, resolve)
            })
        });
        return next()
    }
}

module.exports = bodyparser
```
### router
```js

class Router {
    constructor() {
        this.stack = []
    }
    compose(layers, out, ctx) {
        function dispatch(i) {
            if (i === layers.length) return out()
            let { callback } = layers[i];
            return Promise.resolve(callback(ctx, () => dispatch(i + 1)))
        }
        return dispatch(0)
    }
    routes() {
        return async (ctx, next) => {
            // 请求到来的时候 会执行此函数
            let requestPath = ctx.path;
            let requestMethod = ctx.method.toLowerCase()
            const stack = this.stack.filter(layer => (layer.path === requestPath) && (requestMethod === layer.method))
            return this.compose(stack, next, ctx)
        }
    }
};
class Layer {
    constructor(path, method, callback) {
        this.path = path;
        this.method = method;
        this.callback = callback
    }
}
['get', 'post', 'delete', 'put'].forEach(method => {
    Router.prototype[method] = function (path, callback) {
        this.stack.push(new Layer(path, method, callback))
    }
})


module.exports = Router
```
### serve
```js
const { createReadStream } = require('fs')
const mime = require('mime')
const fs = require('fs/promises')
const path = require('path')
function serve(dirname) {
    return async (ctx, next) => {
        let filepath = path.join(dirname, ctx.path);
        try {
            let statObj = await fs.stat(filepath);
            console.log(filepath)
            if (statObj.isFile()) {
                ctx.type = (mime.getType(filepath) || 'text/pain') + ';charset=utf-8';
                ctx.body = createReadStream(filepath)
            } else {
                return next()
            }
        } catch (e) {
            return next();
        }
    }
}

module.exports = serve

```
# 使用
```js

// 当用户访问路径 /login -> 显示表单
// 点击提交按钮，获取用户输入的内容 
const Koa = require('koa');
const app = new Koa();
const path = require('path')
const { createReadStream } = require('fs')
const bodyparser = require('./middleware/bodyparser')
const Router = require('@koa/router');
const router = new Router();


// 1) 编写koa的时候所有的异步方法都要写成promise , 所有next前面都要+await
// 2) 中间件的执行过程 use, 默认从上到下执行的 （可以处理公共的逻辑）
// 3) 中间 需要继续允许向下执行 （决定是否有权限继续执行） 
// 4) 可以给应用扩展功能

// 专门处理 get /login
app.use(bodyparser({ uploadDir: path.resolve(__dirname, 'upload') }))
app.use(router.routes());

router.get('/login', async (ctx, next) => {
    ctx.type = 'text/html;charset=utf-8'
    ctx.body = createReadStream(path.resolve(__dirname, 'login.html'))
})
router.post('/login', async (ctx, next) => {
    ctx.body = ctx.request.body
})
// app.use(async (ctx, next) => {
//     if (ctx.path === '/login' && ctx.method === 'GET') {
//         // ctx.set('Content-Type','text/html')
//         ctx.type = 'text/html;charset=utf-8'
//         ctx.body = createReadStream(path.resolve(__dirname, 'login.html'))
//     } else {
//         return next()
//     }
// })
// app.use(async (ctx, next) => {
//     if (ctx.path === '/login' && ctx.method === 'POST') {
//         ctx.body = ctx.request.body
//     }
// })

app.listen(3000, function () {
    console.log('server start 3000')
});

// 解析请求体：koa-bodyparser
// 上传文件： @koa/multer
// koa中的路由 @koa/router

```
```js
const Koa = require('koa');
const app = new Koa();
const path = require('path')
const { createReadStream } = require('fs')
const bodyparser = require('./middleware/bodyparser');
const Router = require('./middleware/router');

const router = new Router();
app.use(bodyparser({ uploadDir: path.resolve(__dirname, 'upload') }))


app.use(router.routes());
router.get('/login', async (ctx, next) => {
    ctx.type = 'text/html;charset=utf-8'
    console.log(1)
    await next()
})
router.get('/login', async (ctx, next) => {
    console.log(2)
    ctx.body = createReadStream(path.resolve(__dirname, 'login.html'))
})
router.post('/login', async (ctx, next) => {
    ctx.body = ctx.request.body
})
app.use(function () {
    console.log(3)
})
app.listen(3000, function () {
    console.log('server start 3000')
});



// 解析请求体：koa-bodyparser
// 上传文件： @koa/multer
// koa中的路由 @koa/router

```
```js
const Koa = require('koa');
const app = new Koa();
const path = require('path')
const bodyparser = require('./middleware/bodyparser');
const Router = require('./middleware/router');
const serve = require('./middleware/serve');


// const views = require('koa-views');
const fs = require('fs/promises')
const router = new Router();

function views(url) {

    async function renderFile(filepath, data) {
        let template = await fs.readFile(filepath, 'utf8');
        let head = 'let str = ""\r\n with (obj) {\r\nstr = `'
        let content = template.replace(/<%=(.+?)%>/g, function () {
            return '${' + arguments[1] + '}'
        })

        content = content.replace(/<%(.+?)%>/g, function () {
            return '`\r\n' + arguments[1] + '\r\nstr += `'
        })
        let footer = '`\r\n}\r\nreturn str';
        let fn = new Function('obj', head + content + footer)

        // new Function + with + 拼接字符串
        return fn(data)
    }


    return async (ctx, next) => {
        ctx.render = async function (filename, data) {
            let filepath = path.join(url, filename + '.html');
            ctx.body = await renderFile(filepath, data)
        }
        return next()
    }
}

app.use(views(__dirname + '/views'))


app.use(bodyparser({ uploadDir: path.resolve(__dirname, 'upload') }));
// 1) 编写koa的时候所有的异步方法都要写成promise , 所有next前面都要+await
// 2) 中间件的执行过程 use, 默认从上到下执行的 （可以处理公共的逻辑）
// 3) 中间 需要继续允许向下执行 （决定是否有权限继续执行） 

app.use(serve(path.resolve(__dirname, 'upload')))
app.use(serve(__dirname))
app.use(router.routes());

router.post('/login', async (ctx, next) => {
    ctx.body = ctx.request.body
})
router.get('/', async (ctx) => {
    await ctx.render('my', {
        name: 'jw'
    });

})
app.use(function () {
    console.log(3)
})
app.listen(3000, function () {
    console.log('server start 3000')
});



// 解析请求体：koa-bodyparser
// 上传文件： @koa/multer
// koa中的路由 @koa/router
// koa中静态服务中间价  koa-static
// 模板引擎

```