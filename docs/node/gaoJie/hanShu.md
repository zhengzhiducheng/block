### before 方法
``` js
// 什么是高阶函数 ： 1） 一个函数返回一个函数那么这个函数就是高阶函数   2) 一个函数的参数是一个函数也是高阶函数


// 1） 我们可以通过包装一个函数，对现有的逻辑进行扩展


function core(a,b,c){
    console.log('核心代码',a,b,c)
}
Function.prototype.before = function(cb){ //  2) 一个函数的参数是一个函数也是高阶函数
    // 箭头函数的特点是： 1） 没有this 2) 没有arguments  3）没有prototype
    // this = core
    return (...args)=>{ // 1） 一个函数返回一个函数那么这个函数就是高阶函数
        cb()
        this(...args);
    }
}

let newCore = core.before(function(){
    console.log('before')
})

newCore(1,2,3); // 对原来的方法进行了扩展
```
### 判断数据类型
``` js
// 函数参数的预置 将函数的参数 进行一个保留 (闭包)
// 闭包就是函数定义的作用域和执行的作用域不是同一个 此时就会产生闭包 (靠谱)

// 函数的柯里化   偏函数  都是基于高阶函数来实现的 



// 判断类型 有常见的4种方式
// typeof 可以判断基本类型，  typeof null === 'object'
// instanceof 可以判断某个类型是否属于谁的实例
// Object.prototype.toString 需要再对象的原型中在找到方法
// constructor [].constrotor Array  {}.constructor  Object

/*
function isType(typing,val){

    return (Object.prototype.toString.call(val)) === `[object ${typing}]`
}

// 可不可以将参数预置到函数内部

console.log(isType('Object',{}))
console.log(isType('String','abc'))
console.log(isType('Number',123))
*/


function isType(typing){
    // Number
    return function isNumber(val){
        return (Object.prototype.toString.call(val)) === `[object ${typing}]`
    }
}

let utils = {};

['Number','Boolean','String'].forEach(type => {
    utils[`is${type}`] = isType(type)
});

console.log(utils.isNumber('abc'))


// isType方法的范围比较大  -》 小范围isNumber （函数柯里化，将范围具体化 可以实现批量传递参数  通用的函数科里化的实现）
// 函数反科里化  Object.prototype.toString.call(val)  => toString()


// 高阶函数的作用 1） 可以扩展功能  2） 可以对函数的参数进行预制参数
```
### 柯里化函数
``` js
const currying = (fn,args = []) => {
    let len = fn.length;
    return (..._)=>{
        let arg = args.concat(_);
        if(arg.length < len){
            return currying(fn,arg);
        }
        return fn(...arg);
    }
};
const add = (a, b, c, d, e) => {
  return a + b + c + d + e;
};
let r = currying(add)(1)(2,3)(4,5);
console.log(r);
```
### after函数
``` js
const after = (times, callback) => () => {
  if (--times === 0) {
    callback();
  }
};
const newFn = after(3, () => {
  console.log("ok");
});
```