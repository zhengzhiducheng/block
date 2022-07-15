### 实现静态服务
```js
// npm install mime -g
let server = http.createServer((req,res)=>{
    let {pathname} = url.parse(req.url);
    // 根据请求路径查找文件 
    let absFilePath = path.join(__dirname,pathname);
    fs.stat(absFilePath,(err,stat)=>{
        if(err){
            return res.end(`Not Found`);
        }
        if(stat.isDirectory()){ 
            // 尝试查找index.html
            absFilePath = path.join(absFilePath,'index.html');
            fs.access(absFilePath,(err=>{
                if(err){
                    res.end(`Not Found`);
                }else{
                    let type = mime.getType(absFilePath);   
                    res.setHeader('Content-Type',type+';charset=utf-8');
                    fs.createReadStream(absFilePath).pipe(res);
                }
            }));
        }else{  
            let type = mime.getType(absFilePath);   
            res.setHeader('Content-Type',type+';charset=utf-8');
            fs.createReadStream(absFilePath).pipe(res);
        }
    });
});
server.listen(3000);
```
### 通过async和await改写主体流程

```js
let http = require('http');
let fs = require('fs').promises;
let {createReadStream} = require('fs');
let url = require('url');
let path = require('path');
let mime = require('mime');
class Server{
    async handleServer(req,res){
        let {pathname} = url.parse(req.url);
        let absFilePath = path.join(__dirname,pathname);
        try{
            let statObj = await fs.stat(absFilePath);
            if(statObj.isDirectory()){
                absFilePath = path.join(absFilePath,'index.html');
            }
            this.sendFile(req,res,absFilePath,statObj);
        }catch(err){
            console.log(err);
            this.sendError(req,res);            
        }
    }
    sendFile(req,res,absFilePath,statObj){
        let type = mime.getType(absFilePath);   
        res.setHeader('Content-Type',type+';charset=utf-8');
        createReadStream(absFilePath).pipe(res);
    }
    sendError(req,res){
        res.statusCode = 404;
        res.end(`Not Found`);
    }
    start(){
        let server = http.createServer(this.handleServer.bind(this));
        server.listen(...arguments);
    }
}
let server = new Server();
server.start(3000);
```
### ajax跨域问题
````js
// 'Access-Control-Allow-Origin','http://a.zf.cn:5000' // 允许某个域访问
// 'Access-Control-Allow-Credentials','true'           // 允许携带cookie
// 'Access-Control-Allow-Headers','a'                  // 允许携带的header
// 'Access-Control-Max-Age','3600'                     // 设置options的请求发送时长
let xhr = new XMLHttpRequest();
xhr.open('GET','http://localhost:5000/user',true);
xhr.setRequestHeader('a','1'); // 设置请求头

xhr.onload = function(){
    console.log(xhr.responseText);
}
xhr.withCredentials = true; // 设置强制携带cookie
xhr.send();
````
### 跨域配置
```js
res.setHeader('Access-Control-Allow-Origin','http://a.zf.cn:5000');
res.setHeader('Access-Control-Allow-Credentials','true')
res.setHeader('Access-Control-Max-Age',3600);
res.setHeader('Access-Control-Allow-Headers','a');
if(req.method === 'OPTIONS'){ // options请求直接结束即可
	return res.end()
}
```
### 压缩与解压缩处理(accept-encoding)
```js
// 使用GZIP / DEFLATE 实现解压
var zlib = require('zlib');
var fs = require('fs');
var http = require('http');
http.createServer(function (request, response) {
    var raw = fs.createReadStream('.' + request.url);
    var acceptEncoding = request.headers['accept-encoding'];
    if (!acceptEncoding) {
        acceptEncoding = '';
    }
    if (acceptEncoding.match(/\bdeflate\b/)) {
        response.setHeader('Content-Encoding','deflate');
        raw.pipe(zlib.createDeflate()).pipe(response);
    } else if (acceptEncoding.match(/\bgzip\b/)) {
        response.setHeader('Content-Encoding','gzip');
        raw.pipe(zlib.createGzip()).pipe(response);
    } else {
        raw.pipe(response);
    }
}).listen(9090)
```
### 多语言 (accept-language)
```js
let http = require('http');
let pack = {
    en: {
        title: 'hello'
    },
    cn: {
        title: '欢迎'
    }
}

function request(req, res) {
    let acceptLangulage = req.headers['accept-language'];
    let lan = 'en';
    if (acceptLangulage) {
        lan = acceptLangulage.split(',').map(item => {
            let values = item.split(';');
            return {
                name: values[0].split('-')[0],
                q: isNaN(values[1]) ? 1 : parseInt(values[1])
            }
        }).sort((lan1, lan2) => lan1.q - lan2.q).shift().name;
    }
    res.end(pack[lan] ? pack[lan].title : pack['en'].title);

}
let server = http.createServer();
server.on('request', request);
server.listen(8080);
```