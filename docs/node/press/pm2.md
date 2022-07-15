### 安装pm2
```md
npm install pm2 -g # 安装pm2
pm2 start server.js --watch -i max # 启动进程
pm2 list # 显示进程状态
pm2 kill # 杀死全部进程
pm2 start npm -- run dev # 启动npm脚本
```
### pm2配置文件
```js
// pm2 ecosystem
module.exports = {
  apps : [{
    name: 'my-project',
    script: 'server.js',
    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    args: 'one two',
    instances: 2,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],
  deploy : {
    production : {
      user : 'root',
      host : '39.106.14.146',
      ref  : 'origin/master',
      repo : 'https://github.com/wakeupmypig/pm2-deploy.git',
      path : '/home',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
//pm2 deploy ecosystem.config.js production setup # 执行git clone
// pm2 deploy ecosystem.config.js production # 启动pm2
```