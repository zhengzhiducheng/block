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