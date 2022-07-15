import { defineConfig } from "vitepress"

export default defineConfig({
  title: "政治都城",
  description: "Collection of Vue.js challenges",
  // appearance: false,
  lastUpdated: true,
  themeConfig: {
    logo:'/zd.jpg',
    sidebar: {
      '/node/':[
        {
          text:'高阶函数',
          collapsible:true,
          collapsed:false,
          items:[
            {
              text:'高阶函数定义',
              link:'/node/gaoJie/hanShu'
            },
            {
              text:'使用解决异步',
              link:'/node/gaoJie/moShi'
            }
          ]
        },
        {
          text:'promise',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'使用',
              link:'/node/promise/use'
            },
            {
              text:'promise',
              link:'/node/promise/promise'
            }
          ]
        },
        {
          text:'generator',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'使用',
              link:'/node/generator/use'
            },
            {
              text:'co',
              link:'/node/generator/generator'
            },
            {
              text:'compile',
              link:'/node/generator/compile'
            },
            {
              text:'async',
              link:'/node/generator/async'
            },
            {
              text:'eventLoop',
              link:'/node/generator/eventLoop'
            }
          ]
        },
        {
          text:'模块实现',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'require',
              link:'/node/module/require'
            },
            {
              text:'events',
              link:'/node/module/event'
            }
          ]
        },
        {
          text:'链表',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'单项链表',
              link:'/node/linkedList/linkedList'
            },
            {
              text:'链表反转',
              link:'/node/linkedList/reverse'
            },
            {
              text:'单向循环链表',
              link:'/node/linkedList/loop'
            },
            {
              text:'双向链表',
              link:'/node/linkedList/double'
            },
            {
              text:'双向循环链表',
              link:'/node/linkedList/doubleLoop'
            },
            {
              text:'环形链表',
              link:'/node/linkedList/cycle'
            }
          ]
        },
        {
          text:'树',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'二叉搜索树',
              link:'/node/tree/fork'
            }
          ]
        },
        {
          text:'http',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'header的应用',
              link:'/node/http/header'
            }
          ]
        },
        {
          text:'cook,session,jwt',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'cook,session',
              link:'/node/cookSession/use'
            },
            {
              text:'jwt',
              link:'/node/jwt/use'
            }
          ]
        },
        {
          text:'express',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'express',
              link:'/node/express/write'
            }
          ]
        },
        {
          text:'node进程',
          collapsible:true,
          collapsed:true,
          items:[
            {
              text:'nodePress',
              link:'/node/press/nodePress'
            },
            {
              text:'pm2',
              link:'/node/press/pm2'
            }
          ]
        }
      ]
    },
    nav:[
      {text:'node文档',link:'/node/'},
      {text:'我的',link:'/my/'}
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/zhengzhiducheng/block" },
    ],
    footer: {
      copyright: "Copyright © 2022-present webfansplz",
    },
    editLink: {
      pattern: "https://github.com/webfansplz/vuejs-challenges",
      text: "Edit this page on Gitlab",
    },
    lastUpdatedText: "Last Updated",
    localeLinks: {
      text: "English",
      items: [
        { text: "简体中文", link: "https://cn-vuejs-challenges.netlify.app" },
      ],
    },
  },
})
