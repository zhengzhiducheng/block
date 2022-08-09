### mongoose
```js
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/web', function (err) {
    if (err) return console.log(err);
    console.log('数据库连接成功')
});


const User = require('./model/user');
(async () => {

    // 1) 创建逻辑
    // let arr = []
    // for (let i = 0; i < 10; i++) {
    //     arr.push({ name: ('jw' + i), pwd: 'abc', age: i, gender: 1, address: { num: 10, value: '霍营' } })
    // }
    // let r = await User.create(arr)
    // console.log(r)

    // let r = await User.create({ name: 'jw', pwd: 'abc', age: 120, gender: 1, address: { num: 10, value: '霍营' } })
    // console.log(r)

    // 2）删除逻辑
    // await User.deleteMany({})

    // 3) 查询逻辑 mongo中的原生语法 都支持 , 语法都支持
    // let users = await User.find({ name: /jw(\d)+/, age: { $lt: 5 } }, { pwd: 0 })

    let limit = 3; // 每页显示多少条
    let currentPage = 2;
    // 按照查询的规则来查询 

    // 内部会自动先排序sort + skip + limit
    let r = await User.find().sort({ age: -1 }).limit(limit).skip((currentPage - 1) * limit)

    // 让集合有关联性，可以做关联查询 

    mongoose.disconnect(); // 正常来说项目启动后，肯定不会断开
})()
// class User {
//     constructor() {
//         this.arr = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
//         this.l = 0;
//         this.s = 0;
//     }
//     find() {
//         return Promise.resolve().then(() => {
//             this.arr.slice(this).slice(0, this.l)
//         })
//     }
//     limit(value) {
//         this.l = value;
//     }
//     skip(value) {
//         this.s = value;
//     }
// }

```
```js
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/web', function (err) {
    if (err) return console.log(err);
    console.log('数据库连接成功')
});
const User = require('./model/user');
const Article = require('./model/article');
const Cate = require('./model/cate');



(async () => {
    // let user = await User.findById('62ef69c8275256735421541a');

    // Article.create 相当于用整个集合来创建一个文档
    // 创建一个文档将其保存到集合中
    // let article = await new Article({ title: 'node', content: 'mongodb学习', user_id: user._id }).save()

    // let article = await Article.findById('62ef6e2c515d38e2e102a7ee') // 我现在有了文章id了 如何查询谁写的
    // let user = await User.findById({ _id: article.user_id });

    // 早期的写法，我们主动在表的字段上增加关联
    // let r = await Article.findById('62ef6e2c515d38e2e102a7ee').populate('user_id', { 'name': 1 });
    // console.log(r)


    // 复杂的查询 使用聚合查询，可以实现多表查询，分页查询，平均值、综合，分类、分组  管道
    // let article = await Article.aggregate([
    //     {
    //         $lookup: { // 查询另一张表的方式
    //             from: 'user', // 查询的另一张表是谁
    //             localField: 'user_id', // 我本地的字段 
    //             foreignField: '_id',
    //             as: 'user', // 最终显示的字段是谁
    //         }
    //     },
    //     {
    //         $lookup: { // 查询另一张表的方式
    //             from: 'cate', // 查询的另一张表是谁
    //             localField: 'cate_id', // 我本地的字段 
    //             foreignField: '_id',
    //             as: 'cate', // 最终显示的字段是谁
    //         }
    //     },
    //     {   // 根据这个匹配的结果来进行查询
    //         $match: {
    //             _id: mongoose.Types.ObjectId('62ef6e2c515d38e2e102a7ee')
    //         }
    //     },
    //     {
    //         $project: {
    //             user: {
    //                 name: 1
    //             },
    //             cate: {
    //                 title: 1
    //             }
    //         }
    //     }
    // ]);
    let user = await User.aggregate([
        {
            $match: {}
        },
        {
            // 
            $group: {
                _id: '$name', // 语文 数学 英语 根据表中的名字进行分组 ，分组后可以将年龄累加
                age: { $sum: "$age" }
            }
        },
        {
            $limit: 3
        },
        {
            $skip: 2
        }
    ])
    console.log(user)

    // $lookup  $group $match  $limit $skip


    // await Cate.create([{ title: 'a' }, { title: 'b' }])

    // await Article.findByIdAndUpdate('62ef6e2c515d38e2e102a7ee', { cate_id: '62ef71b81716345de223dadb' })
    // 用户 关联文章 文章关联分类   文章对应的分类谁
    // 用户查到 他用过哪些分类





    mongoose.disconnect()
})()
```
### extends
```js
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/web', function (err) {
    if (err) return console.log(err);
    console.log('数据库连接成功')
});

const UserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    pwd: {
        type: String,
        validate(value) {
            return value.length > 0
        }
    },
    age: {
        type: Number,
        default: 0,
        min: 0,
        max: 120
    },
    gender: {
        type: Number,
        enum: [0, 1]
    },
    array: [String],
    address: {
        num: Number,
        value: String
    },
}, {
    timestamps: true
})

const plugin = require('./5.plugin')
UserSchema.plugin(plugin, { xxx: 'xxx' }); // Vue.use(plugin,{a:1})


const User = mongoose.model('User', UserSchema, 'user');
(async () => {
    // 我希望name作为唯一标识来使用， 我们查询只根据name来查询
    // 1) 扩展1
    // let user = await User.findByName('jw2');

    // 2) 存储用户的密码时 我希望将密码可以自动转换成md5
    const user = await new User({ name: 'zf', pwd: 'zf' }).saveMD5('pwd')
    console.log(user.userLen)
    // 3) 希望在做操作的时候校验用户名是否存在，如果不存在则可以创建
    mongoose.disconnect()
})()
```