### cookie+session实现登录权限
```js
// yarn add koa koa-router koa-views koa-bodyparser koa-session
let Koa = require('koa');
let Router = require('koa-router');
let bodyparser = require('koa-bodyparser');
let views = require('koa-views');
let session = require('koa-session');
let router = new Router()
let app = new Koa();
app.use(bodyparser());
app.use(session({},app));
app.keys = ['zf'];
app.use(views(__dirname+'/views',{
    map:{
        'html':'ejs'
    }
}));
router.get('/',async ctx=>{ // 默认访问首页
    await ctx.render('home.html');
});
router.post('/list',async ctx=>{
    let {username,password} = ctx.request.body;
    if(username === password){ // 用户名和密码相等就认为用户登录过了
        ctx.session.user = {username};
        ctx.redirect('/list')
    }else{
        ctx.redirect('/');
    }
});
router.get('/list',async ctx=>{ // 登陆后才能访问 获取列表页面
    let {username} = ctx.session.user || {};
    if(username){
        let r = await ctx.render('list.html',{username});
        console.log(r)
    }else{
        ctx.redirect('/');
    }
})
app.use(router.routes());
app.listen(4000);
```
### cookie
```js
const Koa = require('koa');
const Router = require('koa-router');
const crypto = require('crypto');
const querystring = require('querystring')
const router = new Router();

const app = new Koa();
app.keys = ['zf']; // 提供密钥
function sign(value, secret) {
    // base64 +  / =  这东西 在传输过程中会变成  + => -  / => _  = -> '
    let content = crypto.createHmac('sha1', secret).update(value).digest('base64url')
    return content;
}
// 2x2JnfQnSthR4rkUqXfReFfQreM
app.use((ctx, next) => {
    let arr = []
    ctx.res.setCookie = function (key, value, options = {}) {
        let optionsArgs = []
        if (options.domain) { // 限制域名
            optionsArgs.push(`domain=${options.domain}`)
        }
        if (options.path) { // 险种 路径 基本不使用
            optionsArgs.push(`path=${options.path}`)
        }
        if (options.maxAge) { //  所有的max-age 都是以s为单位  // 设置cookie的有限期
            optionsArgs.push(`max-age=${options.maxAge}`)
        }
        if (options.httpOnly) { // 服务端设置后 客户端无法获取 (不能通过代码读取用户的信息 document.cookie)
            optionsArgs.push(`httpOnly=${options.httpOnly}`); // 用户可以自己改，发请求的时候也可以瞎写
            // axios.request({headers:{cookie:'xxx}})
        }
        if (options.signed) {
            // 需要对内容进行加盐 
            const v = sign(`${key}=${value}`, 'zf');
            arr.push(`${key}.sig=${v}`); // key.sign, v
        }
        arr.push(`${key}=${value}; ${optionsArgs.join('; ')}`)
        ctx.res.setHeader('Set-Cookie', arr);
    }
    ctx.req.getCookie = function (name, options = {}) {
        const cookie = ctx.req.headers['cookie'];
        const cookieObj = querystring.parse(cookie, '; ', '=')
        if (options.signed) {
            // jw  签名
            if (cookieObj[name + '.sig'] == sign(`${name}=${cookieObj[name]}`, 'zf')) {
                return cookieObj[name]
            } else {
                return '值被篡改'
            }
        }
        return cookieObj[name]
    }
    return next();
})
app.use(router.routes());
// name,value,domain,path,maxAge,httpOnly
// key=value; key=value

// md5 -> sha256（需要提供一个密钥，加盐算法）

router.get('/write', async (ctx) => {
    // domain 可以设置在哪个域名下设置cookie和读取cookie
    ctx.cookies.set('name', 'jw', { signed: true })
    // ctx.res.setCookie('name', 'jw', { signed: true }); // 给当前的信息增加一个签名，让他变得更安全
    ctx.body = 'write ok'
});

router.get('/read', async function (ctx) {
    ctx.body = ctx.cookies.get('name', { signed: true }) || '空'
})

app.listen(3000, function () {
    console.log(`server start 3000`)
})
```
### session
```js
const Koa = require('koa');
const Router = require('koa-router');
const crypto = require('crypto');
const querystring = require('querystring')
const uuid = require('uuid')
const router = new Router();
const app = new Koa();
app.use(router.routes())

// 想记录用户访问服务器的次数


const sid = 'connect.sid'; // 你第一次链接我的时候 我需要给你设置一个卡号
const session = {}; // 这就是session， session会需要做持久化。 我们想共享登陆状态


// session 就是解决cookie不能存放敏感信息的问题

router.get('/visit', async function (ctx) {
    let v = ctx.cookies.get(sid); // 如果用户有sid的cookie说明来了
    let obj = session[v]; // session存放着用户访问的次数
    if (v && obj) {
        obj.visit++;
        ctx.body = '您是第' + obj.visit + '次访问，欢迎下次再来'
    } else {
        let str = ''
        if (v && !obj) {
            str = '你的卡作废了,'
        }
        let value = uuid.v4();
        ctx.cookies.set(sid, value, { maxAge: 10000 }); // 你第一次来 会得到connect.sid 发的一张卡
        session[value] = { visit: 1 }; // 记录用户访问了多少次
        ctx.body = str + '您是第一次访问，欢迎下次再来'
    }
});
// session 不用设置过期时间 ，cookie来设置
app.listen(3000, function () {
    console.log(`server start 3000`)
})
```