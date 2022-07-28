### 客户端
```js
const net = require("net"); // net 就是tcp模块
const socket = new net.Socket(); // 套接字  双工流
// 连接8080端口
socket.connect(8080, "localhost");
// 连接成功后给服务端发送消息
socket.on("connect", function (data) {
  //   socket.write("hello"); // 浏览器和客户端说 hello
  socket.end();
});
socket.on("data", function (data) {
  // 监听服务端的消息
  console.log(data.toString());
});
socket.on("error", function (error) {
  console.log(error);
});

```
### 服务端
```js
const net = require("net");
const server = net.createServer(function (socket) {
  socket.on("data", function (data) {
    // 客户端和服务端
    // socket.write("hi"); // 服务端和客户端说 hi
  });
  socket.on("end", function () {
    console.log("客户端关闭");
  });
});
server.on("error", function (err) {
  console.log(err);
});
server.listen(8080); // 监听8080端口

// client -> server hello
// server -> client hi
// 客户端主动和服务端分手，

// require('http')-> require('net')
//  request response   socket

```