### 先看问题
```js
const http = require('http');
http.createServer((req,res)=>{
    if(req.url === '/sum'){ // 求和
        let sum = 0;
        for(let i = 0 ; i < 10000000000 ;i++){
            sum+=i;
        }
        res.end(sum+'')
    }else{
        res.end('end');
    }
}).listen(3000);
// 这里我们先访问/sum，在新建一个浏览器页卡访问/ 
// 会发现要等待/sum路径处理后才能处理/路径 
```

### spawn产卵，可以通过此方法创建一个子进程
```js
let { spawn } = require("child_process");
let path = require("path");
// 通过node命令执行sub_process.js文件
let childProcess = spawn("node",['sub_process.js'], {
    cwd: path.resolve(__dirname, "test"), // 找文件的目录是test目录下
    stdio: [0, 1, 2]
});
// 监控错误
childProcess.on("error", function(err) {
    console.log(err);
});
// 监听关闭事件
childProcess.on("close", function() {
    console.log("close");
});
// 监听退出事件
childProcess.on("exit", function() {
    console.log("exit");
});
```
### 0,1,2分别对应当前主进程的process.stdin,process.stdout,process.stderr,意味着主进程和子进程共享标准输入和输出
```js
let childProcess = spawn("node",['sub_process.js'], {
  cwd: path.resolve(__dirname, "test"), // 找文件的目录是test目录下
  stdio: [0, 1, 2] 
});
```
### 默认不提供stdio参数时，默认值为 stdio:['pipe']，也就是只能通过流的方式实现进程之间的通信
```js
let { spawn } = require("child_process");
let path = require("path");
// 通过node命令执行sub_process.js文件
let childProcess = spawn("node",['sub_process.js'], {
  cwd: path.resolve(__dirname, "test"),
  stdio:['pipe'] // 通过流的方式
});
// 子进程读取写入的数据
childProcess.stdout.on('data',function(data){
    console.log(data);
});
// 子进程像标准输出中写入
process.stdout.write('hello');
```
### 使用ipc方式通信,设置值为stdio:['pipe','pipe','pipe','ipc'],可以通过on('message')和send方法进行通信
```js
let { spawn } = require("child_process");
let path = require("path");
// 通过node命令执行sub_process.js文件
let childProcess = spawn("node",['sub_process.js'], {
  cwd: path.resolve(__dirname, "test"),
  stdio:['pipe','pipe','pipe','ipc'] // 通过流的方式
});
// 监听消息
childProcess.on('message',function(data){
    console.log(data);
});
// 发送消息
process.send('hello');
```
### 产生独立进程
```js
let { spawn } = require("child_process");
let path = require("path");
// 通过node命令执行sub_process.js文件
let child = spawn('node',['sub_process.js'],{
    cwd:path.resolve(__dirname,'test'),
    stdio: 'ignore',
    detached:true // 独立的线程
});
child.unref(); // 放弃控制
```
### fork
```js
let { fork } = require("child_process");
let path = require("path");
// 通过node命令执行sub_process.js文件
let childProcess = fork('sub_process.js', {
  cwd: path.resolve(__dirname, "test"),
});
childProcess.on('message',function(data){
    console.log(data);
});
```
### fork原理
```js
function fork(filename,options){
    let stdio = ['inherit','inherit','inherit']
    if(options.silent){ // 如果是安静的  就忽略子进程的输入和输出
        stdio = ['ignore','ignore','ignore']
    }
    stdio.push('ipc'); // 默认支持ipc的方式
    options.stdio = stdio
    return spawn('node',[filename],options)
}
```
### 写到这我们就可以解决开始的问题了
```js
const http = require('http');
const {fork} = require('child_process');
const path = require('path');
http.createServer((req,res)=>{
    if(req.url === '/sum'){
        let childProcess = fork('calc.js',{
            cwd:path.resolve(__dirname,'test')
        });
        childProcess.on('message',function(data){
            res.end(data+'');
        })
    }else{
        res.end('ok');
    }
}).listen(3000);
```
###  execFile exec
```js
// execFile
let childProcess = execFile("node",['./test/sub_process'],function(err,stdout,stdin){
    console.log(stdout); 
});
// exec
let childProcess = exec("node './test/sub_process'",function(err,stdout,stdin){
    console.log(stdout)
});
```

### cluster
```js
// Node.js的单个实例在单个线程中运行。为了利用多核系统，用户有时会希望启动Node.js进程集群来处理负载。
let { fork } = require("child_process");
let len = require("os").cpus().length;
let child = fork("server.js", {});

const http = require("http");
const path = require("path");
// 创建服务
let server = http
    .createServer((req, res) => {
        res.end(process.pid + ":process");
    })
    .listen(3000,function(){
        console.log('服务启动')
    });
for (let i = 0; i < len; i++) {
    let child = fork('server.js');
    child.send('server',server); // 让子进程监听同一个服务
}
```
### 使用cluster模块
```js
let cluster = require("cluster");
let http = require("http");
let cpus = require("os").cpus().length;
const workers = {};
if (cluster.isMaster) {
    cluster.on('exit',function(worker){
        console.log(worker.process.pid,'death')
        let w = cluster.fork();
        workers[w.pid] = w;
    })
  for (let i = 0; i < cpus; i++) {
    let worker = cluster.fork();
    workers[worker.pid] = worker;
  }
} else {
  http
    .createServer((req, res) => {
      res.end(process.pid+'','pid');
    })
    .listen(3000);
  console.log("server start",process.pid);
}
```