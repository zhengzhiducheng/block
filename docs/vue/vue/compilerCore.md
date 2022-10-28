### transforms

###### transformElement

```js
import { createObjectExpression, createVnodeCall, NodeTypes } from "../ast";

export function transformElement(node,context){   // 我们期望 给所有儿子处理完后，给元素重新添加children属性
    // 可以判断你是不是元素
    if(node.type === NodeTypes.ELEMENT){
        return () =>{

            // createElementVnode('div',{},孩子)

            let vnodeTag = `"${node.tag}"`;
            let properties = [];
            let props = node.props
            for(let i = 0 ;i  <props.length;i++ ){
                properties.push({
                    key:props[i].name,
                    value:props[i].value.content
                })
            }
            // 创建一个属性的表达式
            const propsExpression = properties.length > 0 ? createObjectExpression(properties) : null

            // 需要考虑孩子的情况  直接是一个节点

            let childrenNode = null
            if(node.children.length === 1){
                childrenNode = node.children[0];
            }else if(node.children.length > 1){
                childrenNode = node.children
            }

            // createElementVnode
            node.codegenNode = createVnodeCall(context,vnodeTag,propsExpression,childrenNode)

        }
    }
}
###### transformExpression
```

###### transformExpression

```js
import { NodeTypes } from "../ast";

export function transformExpression(node, context) {
  // {{aaa}} -> _ctx.aaa
  // 是不是表达式
  if (node.type === NodeTypes.INTERPOLATION) {
    let content = node.content.content;
    node.content.content = `_ctx.${content}`;
  }
}

// 替换并且增加方法 即可
```

###### transformText

```js
import { PatchFlags } from "@vue/shared";
import { createCallExpression, NodeTypes } from "../ast";

export function isText(node) {
  return node.type === NodeTypes.INTERPOLATION || node.type === NodeTypes.TEXT;
}

export function transformText(node, context) {
  // 我期望 将多个子节点拼接在一起
  // 你是不是文本
  // 需要遇到元素的时候 才能处理 多个子节点
  if (node.type === NodeTypes.ELEMENT || node.type === NodeTypes.ROOT) {
    return () => {
      // 5 表达式  +  2 文本  =》 COMPOUND_EXPRESSION  最后只需要创建的时候创建一个节点就可以了
      let currentContainer = null;
      let children = node.children;
      let hasText = false;
      for (let i = 0; i < children.length; i++) {
        let child = children[i]; // 拿到第一个孩子
        hasText = true;
        if (isText(child)) {
          // 看下一个节点是不是文本
          for (let j = i + 1; j < children.length; j++) {
            let next = children[j];
            if (isText(next)) {
              if (!currentContainer) {
                currentContainer = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                };
              }
              // 直接将下一个节点和第一个节点拼接在一起
              currentContainer.children.push(`+`, next);
              children.splice(j, 1); // 删除拼接的节点
              j--;
            } else {
              currentContainer = null;
              break;
            }
          }
        }
      }
      // !true  =>  false || xxx
      if (!hasText || children.length === 1) {
        // 长度是1 而且是文本   ( 就是元素也不管)
        return;
      }

      // 只有是为本 而且是多个才要处理

      // 需要给多个儿子中的创建文本节点添加 patchFlag
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        const callArgs = [];
        // createTextVnode(_ctx.xxx)
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          // 都是文本
          callArgs.push(child);
          if (node.type !== NodeTypes.TEXT) {
            // 动态节点
            callArgs.push(PatchFlags.TEXT); // 靶向更新
          }
          children[i] = {
            // 添加一个createTextVnode这个方法
            type: NodeTypes.TEXT_CALL, // 通过createTextVnode来实现
            content: child,
            codegenNode: createCallExpression(context, callArgs),
          };
        }
      }

      // patchFlag   元素里有一个文本 {{aa}} 标识位应该是一个文本

      // 需要查找乱序的 2 和 5将他们拼接在一起

      // {{aaa}} abc  =>  组合的表达式  COMPOUND_EXPRESSION
    };
  }
}

// codegen (周日 pinia的实现原理 vue-router实现原理)

// 手写一个keep-alive provide / inject  teleport suspense

// ts ->

// ts + vite + pinia
```

### ast

```js
import { CREATE_ELEMENT_VNODE, CREATE_TEXT } from "./runtimeHelpers";

export const enum NodeTypes {
    ROOT, // 根节点
    ELEMENT, // 元素
    TEXT, // 文本
    COMMENT, // 注释
    SIMPLE_EXPRESSION, // 简单表达式  aaa   :a="aa"
    INTERPOLATION, // 模板表达式  {{aaa}}
    ATTRIBUTE,
    DIRECTIVE,
    // containers
    COMPOUND_EXPRESSION, // 复合表达式  {{aa}} abc
    IF,
    IF_BRANCH,
    FOR,
    TEXT_CALL, // 文本调用
    // codegen
    VNODE_CALL, // 元素调用
    JS_CALL_EXPRESSION, // js调用表达式
    JS_OBJECT_EXPRESSION
}


export function createCallExpression(context,args){
    let callee = context.helper(CREATE_TEXT);
    return {
        callee,
        type:NodeTypes.JS_CALL_EXPRESSION,
        arguments:args
    }
}

export function createObjectExpression(properties){
    return {
        type:NodeTypes.JS_OBJECT_EXPRESSION,
        properties
    }
}

export function createVnodeCall(context,vnodeTag,propsExpression,childrenNode){
    context.helper(CREATE_ELEMENT_VNODE);
    return {
        type:NodeTypes.VNODE_CALL,
        tag:vnodeTag,
        props:propsExpression,
        children: childrenNode
    }
}

// TEXT_CALL -> 文本的意思    JS_CALL_EXPRESSION 调用文本表达式

// VNODE_CALL -> 元素   JS_OBJECT_EXPRESSION属性
```

### generate

```js
import { NodeTypes } from "./ast";
import { helperMap, TO_DISPLAY_STRING } from "./runtimeHelpers";

function createCodegenContext(ast) {
  const context = {
    code: "", // 最后的生成结果
    helper(name) {
      return `${helperMap[name]}`;
    },
    push(code) {
      context.code += code;
    },
    indentLevel: 0,
    indent() {
      // 向后缩进
      ++context.indentLevel;
      context.newline();
    },
    deindent(whithoutNewLine = false) {
      // 向前缩进
      if (whithoutNewLine) {
        --context.indentLevel;
      } else {
        --context.indentLevel;
        context.newline();
      }
    },
    newline() {
      // 根据 indentLevel来生成新的行
      newline(context.indentLevel);
    },
  };
  function newline(n) {
    context.push("\n" + "  ".repeat(n));
  }

  return context;
}
function genFunctionPreable(ast, context) {
  if (ast.helpers.length > 0) {
    context.push(
      `import { ${ast.helpers
        .map((h) => `${context.helper(h)} as _${context.helper(h)}`)
        .join(",")} } from "vue" `
    );
    context.newline();
  }
  context.push(`export `);
}

function genText(node, context) {
  context.push(JSON.stringify(node.content));
}
function genInterpolation(node, context) {
  context.push(`${helperMap[TO_DISPLAY_STRING]}(`); // {{}}  {{xxx}}
  genNode(node.content, context);
  context.push(")");
}
function genExpression(node, context) {
  context.push(node.content);
}
function genNode(node, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    // 元素 -》 元素对象 -》 元素的儿子 递归

    // fragmenent也要处理
  }
}
export function generate(ast) {
  const context = createCodegenContext(ast);
  const { push, indent, deindent } = context;
  genFunctionPreable(ast, context);
  const functionName = "render";
  const args = ["_ctx", "_cache", "$props"];
  push(`function ${functionName}(${args.join(",")}){`);
  indent();
  push("return ");

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context);
  } else {
    push("null");
  }
  deindent();
  push("}");

  console.log(context.code);
}
```

### index

```js
import { generate } from "./generate";
import { parse } from "./parse";
import { transform } from "./transform";

export function compile(template) {
  // 将模板转成抽象语法树
  const ast = parse(template); // 这里需要将html语法转换成js语法  编译原理

  // codegen 为了生成代码的时候更方便 在转化过程中会生成这样一个属性
  // 这里转化 要进行收集所需的方法 createElementVnode  toDisplayString
  // 这里需要在生成代码之前，在做一些转化  <div>{{aa}} 123</div>  createElementVnode('div',toDisplayString(aa) + 123))

  // 元素、属性、表达式、文本
  transform(ast);

  // 对ast语法树进行一些预先处理
  // transform(ast); // 会生成一些信息
  // // 代码生成
  return generate(ast); // 最终生成代码  和vue的过程一样
}
```

### parse

```js
import { NodeTypes } from "./ast";

function createParserContext(template) {
  return {
    line: 1,
    column: 1,
    offset: 0,
    source: template, // 此字段会被不停的进行解析 slice
    originalSource: template,
  };
}

function isEnd(context) {
  const source = context.source;
  if (context.source.startsWith("</")) {
    return true;
  }
  return !source; // 如果解析完毕后为空字符串时表示解析完毕
}

function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}

function advancePositionWithMutation(context, source, endIndex) {
  let linesCount = 0;
  let linePos = -1;
  for (let i = 0; i < endIndex; i++) {
    if (source.charCodeAt(i) == 10) {
      linesCount++;
      linePos = i;
    }
  }
  context.line += linesCount;
  context.offset += endIndex;
  context.column =
    linePos == -1 ? context.column + endIndex : endIndex - linePos;
}

function advanceBy(context, endIndex) {
  // 每次删掉内容的时候 都要更新最新的行列和偏移量信息
  let source = context.source;
  advancePositionWithMutation(context, source, endIndex);
  context.source = source.slice(endIndex);
}
function parseTextData(context, endIndex) {
  const rawText = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return rawText;
}
function getSelection(context, start, end?) {
  end = end || getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset),
  };
}

function parseText(context) {
  // 在解析文本的时候 要看 后面到哪里结束
  let endTokens = ["<", "{{"];
  // as {{das<dsadsadda
  let endIndex = context.source.length; // 默认认为到最后结束
  for (let i = 0; i < endTokens.length; i++) {
    let index = context.source.indexOf(endTokens[i], 1);
    // 找到了 并且第一次比整个字符串小
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }
  // 创建 行列信息
  const start = getCursor(context); // 开始
  // 取内容
  const content = parseTextData(context, endIndex);
  return {
    type: NodeTypes.TEXT,
    content: content,
    loc: getSelection(context, start),
  };
  // 在获取结束的位置
}
// getCousor 获取位置的信息 根据当前的上下文
// parseTextData 处理文本内容的， 并且会更新最新的便宜量信息
// advancePositionWithMutation 更新信息
// getSelection 获取当前开头和结尾的位置
// adanceBy 会进行前进删除

function parseInterpolation(context) {
  // 处理表达式的信息
  const start = getCursor(context); // xxx  }}
  const closeIndex = context.source.indexOf("}}", 2); // 查找结束的大括号
  advanceBy(context, 2); // {{  xx }}
  const innerStart = getCursor(context);
  const innerEnd = getCursor(context); // advancePositionWithMutation

  // 拿到原始的内容
  const rawContentLength = closeIndex - 2; // 原始内容的长度
  let preContent = parseTextData(context, rawContentLength); // 可以返回文本内容，是并且可以更新信息
  let content = preContent.trim();
  let startOffset = preContent.indexOf(content); //   {{  xxxx}}

  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, preContent, startOffset);
  }
  let endOffset = startOffset + content.length;
  advancePositionWithMutation(innerEnd, preContent, endOffset);
  advanceBy(context, 2);
  return {
    type: NodeTypes.INTERPOLATION, // 表达式
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content,
      loc: getSelection(context, innerStart, innerEnd),
    },
    loc: getSelection(context, start), // 表达式相关的信息
  };
}

function advanceBySpaces(context) {
  let match = /^[ \t\r\n]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}
function parseAttributeValue(context) {
  const start = getCursor(context);
  let quote = context.source[0];
  let content;
  if (quote == '"' || quote === "'") {
    advanceBy(context, 1); // "a"
    const endIndex = context.source.indexOf(quote);
    content = parseTextData(context, endIndex);
    advanceBy(context, 1); // "a"
  }
  return {
    content,
    loc: getSelection(context, start),
  };
}

function parseAttribute(context) {
  const start = getCursor(context);
  // 属性的名字
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  let name = match[0];
  advanceBy(context, name.length); // a  = '
  advanceBySpaces(context);
  advanceBy(context, 1);
  let value = parseAttributeValue(context);
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      type: NodeTypes.TEXT,
      ...value,
    },
    loc: getSelection(context, start),
  };
}
function parseAttributes(context) {
  // a=1 b=2 >
  const props = [];
  while (context.source.length > 0 && !context.source.startsWith(">")) {
    const prop = parseAttribute(context);
    props.push(prop);
    advanceBySpaces(context);
  }
  return props;
}
function parseTag(context) {
  const start = getCursor(context);
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
  const tag = match[1]; // 标签名   div   aa=1  >
  advanceBy(context, match[0].length); // 删除整个标签
  advanceBySpaces(context);

  let props = parseAttributes(context);

  // <div>  <div/>
  // 可能有属性
  let isSelfClosing = context.source.startsWith("/>");

  advanceBy(context, isSelfClosing ? 2 : 1);
  return {
    type: NodeTypes.ELEMENT,
    tag: tag,
    isSelfClosing,
    children: [],
    props,
    loc: getSelection(context, start),
  };
}
function parseElement(context) {
  // </div>
  let ele = parseTag(context); // <div>
  // 儿子
  let children = parseChildren(context); // 处理儿子的时候 可能没有儿子
  if (context.source.startsWith("</")) {
    parseTag(context);
  }
  ele.loc = getSelection(context, ele.loc.start); // 计算最新的位置信息
  ele.children = children; // 挂载儿子节点
  return ele;
}
export function parse(template) {
  // 创建一个解析的上下文 来进行处理
  const context = createParserContext(template);
  // < 元素
  // {{}} 说明表达式
  // 其他就是文本
  const start = getCursor(context);
  return createRoot(parseChildren(context), getSelection(context, start));
}
function createRoot(children, loc) {
  return {
    type: NodeTypes.ROOT, // Fragment
    children,
    loc,
  };
}
function parseChildren(context) {
  const nodes = [];
  while (!isEnd(context)) {
    const source = context.source;
    let node;
    if (source.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (source[0] === "<") {
      // 标签
      node = parseElement(context);
    }
    // 文本
    if (!node) {
      // {{aa}}  aaa  {{bbb}}
      node = parseText(context);
    }
    nodes.push(node);
  }
  nodes.forEach((node, i) => {
    if (node.type === NodeTypes.TEXT) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null;
      }
    }
  });
  return nodes.filter(Boolean);
}
```

### runtimeHelpers

```js
export const TO_DISPLAY_STRING = Symbol("toDisplayString");
export const CREATE_TEXT = Symbol("createTextVNode");
export const CREATE_ELEMENT_VNODE = Symbol("createElementVnode");
export const OPEN_BLOCK = Symbol("openBlock");
export const CREATE_ELEMENT_BLOCK = Symbol("createElementBlock");
export const FRAGMENT = Symbol("fragment");
export const helperMap = {
  [TO_DISPLAY_STRING]: "toDisplayString",
  [CREATE_TEXT]: "createTextVNode",
  [CREATE_ELEMENT_VNODE]: "createElementVnode",
  [OPEN_BLOCK]: "openBlock",
  [CREATE_ELEMENT_BLOCK]: "createElementBlock",
  [FRAGMENT]: "fragment",
};
```

### transform

```js
import { createVnodeCall, NodeTypes } from "./ast";
import {
  CREATE_ELEMENT_BLOCK,
  CREATE_ELEMENT_VNODE,
  FRAGMENT,
  OPEN_BLOCK,
  TO_DISPLAY_STRING,
} from "./runtimeHelpers";
import { transformElement } from "./transforms/transformElement";
import { transformExpression } from "./transforms/transformExpression";
import { transformText } from "./transforms/transformText";

function createTransformContext(root) {
  const context = {
    currentNode: root, // 当前正在转化的是谁
    parent: null, // 当前转化的父节点是谁
    helpers: new Map(), // 优化 超过20个相同节点会被字符串化
    helper(name) {
      // 根据使用过的方法进行优化
      const count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
      return name;
    },
    removeHelper(name) {
      const count = context.helpers.get(name);
      if (count) {
        const currentCount = count - 1;
        if (!currentCount) {
          context.helpers.delete(name);
        } else {
          context.helpers.set(name, currentCount);
        }
      }
    },
    nodeTransforms: [
      transformElement, // 转化元素  -》 转化文本  -> 转化文本 exit  - 转化元素 exit
      transformText,
      transformExpression,
    ],
  };
  return context;
}
function traverse(node, context) {
  context.currentNode = node;
  const transforms = context.nodeTransforms;
  const exitsFns = [];
  for (let i = 0; i < transforms.length; i++) {
    let onExit = transforms[i](node, context); // 在执行的时候 有可能这个node被删除了
    if (onExit) {
      exitsFns.push(onExit);
    }
    if (!context.currentNode) return; // 如果当前节点被删掉了，那么就不考虑儿子了
  }
  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      // 宏 常量
      context.helper(TO_DISPLAY_STRING);
      break;
    case NodeTypes.ELEMENT:
    case NodeTypes.ROOT:
      for (let i = 0; i < node.children.length; i++) {
        context.parent = node;
        traverse(node.children[i], context);
      }
  }
  context.currentNode = node; // 当执行退出韩式的时候保证currentNode指向的依旧是对的
  let i = exitsFns.length;
  while (i--) {
    exitsFns[i]();
  }
}

function createRootCodegen(ast, context) {
  let { children } = ast;

  if (children.length === 1) {
    const child = children[0];
    // 如果是元素 ， 还有可能就是一个文本
    if (child.type === NodeTypes.ELEMENT && child.codegenNode) {
      ast.codegenNode = child.codegenNode; // 不在调用createElementVnode
      // 调用的是 openBlcik  createElementBlock
      context.removeHelper(CREATE_ELEMENT_VNODE);
      context.helper(OPEN_BLOCK);
      context.helper(CREATE_ELEMENT_BLOCK);
      ast.codegenNode.isBlock = true; // 只有一个元素，那么当前元素是一个block节点，并且使用的是createElementBlock
    } else {
      ast.codegenNode = child;
    }
  } else {
    if (children.length === 0) return;
    ast.codegenNode = createVnodeCall(
      context,
      context.helper(FRAGMENT),
      null,
      children
    );
    context.helper(OPEN_BLOCK);
    context.helper(CREATE_ELEMENT_BLOCK);
    ast.codegenNode.isBlock = true;
  }
}
export function transform(ast) {
  // 对树进行遍历操作
  const context = createTransformContext(ast);
  traverse(ast, context);
  createRootCodegen(ast, context);
  ast.helpers = [...context.helpers.keys()];
  // 根据此ast生成代码  靶向更新
}

// vue2在编译的过程中做的事非常 少  vue3 做的非常多 （diff算法优化更好）
```
