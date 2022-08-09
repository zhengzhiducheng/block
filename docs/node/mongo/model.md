### article
```js
const mongoose = require('mongoose');


const ArticleSchema = mongoose.Schema({
    title: String,
    content: String,
    //  文章里面要存着，是哪个用户编写的文章
    user_id: {
        // ref: 'User', // 这个字段引用了User集合
        type: mongoose.SchemaTypes.ObjectId
    },
    cate_id: {
        // 关联分类的id
        type: mongoose.SchemaTypes.ObjectId
    }
}, {
    // 默认创建用户的时候 会添加两个字段
    timestamps: true
})


module.exports = mongoose.model('Article', ArticleSchema, 'article')

```
### cate
```js
const mongoose = require('mongoose');
const CateSchema = mongoose.Schema({
    title: String,
}, {
    timestamps: true
})
module.exports = mongoose.model('Cate', CateSchema, 'cate')

```
### user
```js
const mongoose = require('mongoose');
// 要告诉人家 存储的规则是什么，还有结构是什么，这样才可以查询数据 , 规划集合中存储文档的格式
const UserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true, // 必填
        // unique: true, // 唯一标识
        lowercase: true, // 全部小写
        trim: true, // 去掉前后空格
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
    address: { // 对象套对象
        num: Number,
        value: String
    },
    // birtyday: {
    //     type: Date,
    //     default: Date.now
    // }
}, {
    // 默认创建用户的时候 会添加两个字段
    timestamps: true
})
// User 就是集合, 自动将集合转成小写的并且+s

module.exports = mongoose.model('User', UserSchema, 'user');
```