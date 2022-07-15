### 二叉搜索树
```js
class Node {
    constructor(element, parent) {
        this.element = element;
        this.parent = parent;
        this.left = null;
        this.right = null;
    }
}
class BST {
    constructor() {
        this.root = null;
        this.size = 0;
    }
    add(element) {
        if (this.root == null) {
            this.root = new Node(element, null);
            this.size++;
            return;
        }
        let currentNode = this.root; // 默认从根节点开始查找
        let parent = null;
        let compare = null;
        while (currentNode) {
            compare = element - currentNode.element;
            parent = currentNode; // 记住父节点
            if (compare > 0) { // 大于当前节点放到右边
                currentNode = currentNode.right;
            } else if (compare < 0) {
                currentNode = currentNode.left;
            } else {
                currentNode.element = element;
                return;
            }
        }
        let newNode = new Node(element, parent);
        if (compare > 0) {
            parent.right = newNode;
        } else {
            parent.left = newNode;
        }
        this.size++;
    }
}
let bst = new BST();
let arr = [10,8,19,6,15,22];
arr.forEach(item => {
    bst.add(item);
});
console.dir(bst.root);
```
### 复杂数据的存储
```js
class Node {
    constructor(element, parent) {
        this.element = element;
        this.parent = parent;
        this.left = null;
        this.right = null;
    }
}
class BST {
    constructor(compare) {
        this.root = null;
        this.size = 0;
        this.compare = compare || this.compare;
    }
    compare(e1,e2){
        return e1 - e2;
    }
    add(element) {
        // ....
        while (currentNode) {
            compare = this.compare(element,currentNode.element);
            // ....
        }
        // ....
        this.size++;
    }
}
let bst = new BST((e1, e2) => {
    return e1.age - e2.age;
});
let arr = [{ age: 10 }, { age: 8 }, { age: 19 }, { age: 6 }, { age: 15 }, { age: 22 }];
arr.forEach(item => {
    bst.add(item);
});
console.dir(bst.root);
```
### 二叉树的遍历-前序遍历
```js
preorderTraversal() {
	const traversal = (node) => {
	if (node === null) return
        console.log(node.element); // 先访问根节点
        traversal(node.left); // 在访问左子树
        traversal(node.right);// 在访问右子树
    }
    traversal(this.root);
} 
```
### 二叉树的遍历-中序遍历
```js
inorderTraversal() {
    const traversal = (node) => {
        if (node === null) return
        traversal(node.left);
        console.log(node.element);
        traversal(node.right);
    }
    traversal(this.root);
}
```
### 二叉树的遍历-后续遍历
```js
postorderTraversal() {
    const traversal = (node) => {
        if (node === null) return
        traversal(node.left);
        traversal(node.right);
        console.log(node.element);
    }
    traversal(this.root);
}
```
### 二叉树的遍历-层序遍历
```js
levelOrderTraversal() {
    if (this.root == null) return;
    let stack = [this.root];
    let currentNode = null;
    let index = 0;
    while (currentNode = stack[index++]) {
        console.log(currentNode.element);
        if (currentNode.left) {
            stack.push(currentNode.left);
        }
        if (currentNode.right) {
            stack.push(currentNode.right);
        }
    }
}
```
### 遍历树对节点进行操作
```js
preorderTraversal(visitor) {
    if(visitor == null) return;
    const traversal = (node) => {
        if (node === null) return
        visitor.visit(node.element);
        traversal(node.left);
        traversal(node.right);
    }
    traversal(this.root);
}
inorderTraversal(visitor) {
    if(visitor == null) return;
    const traversal = (node) => {
        if (node === null) return
        traversal(node.left);
        visitor.visit(node.element);
        traversal(node.right);
    }
    traversal(this.root);
}
postorderTraversal(visitor) {
    if(visitor == null) return;
    const traversal = (node) => {
        if (node === null) return;
        traversal(node.left);
        traversal(node.right);
        visitor.visit(node.element);
    }
    traversal(this.root);
}
levelOrderTraversal(visitor) {
    if (this.root == null || visitor == null) return;
    let stack = [this.root];
    let currentNode = null;
    let index = 0;
    while (currentNode = stack[index++]) {
        visitor.visit(currentNode.element)
        if (currentNode.left) {
            stack.push(currentNode.left);
        }
        if (currentNode.right) {
            stack.push(currentNode.right);
        }
    }
}
```
### 翻转二叉树
```js
invertTree(){
    if (this.root == null) return;
    let stack = [this.root];
    let currentNode = null;
    let index = 0;
    while (currentNode = stack[index++]) {
        let tmp = currentNode.left;
        currentNode.left = currentNode.right;
        currentNode.right = tmp
        if (currentNode.left) {
            stack.push(currentNode.left);
        }
        if (currentNode.right) {
            stack.push(currentNode.right);
        }
    }
    return this.root;
}
```
### 前驱节点 & 后继节点
```js
predesessor(node) {
    if (node == null) return null;
    let prev = node.left;
    if (prev !== null) { // 找左子树中最右边的节点
        while (prev.right !== null) {
            prev = prev.right;
        }
        return prev;
    }
    // 当前父节点存在，并且你是父节点的左子树
    while (node.parent != null && node == node.parent.left) {
        node = node.parent;
    }
    return node.parent;
}
```
### 对一棵二叉树进行中序遍历,遍历后的顺序,当前节点的下一个节点为该节点的后继节点;
```js
successor(node) {
    if (node == null) return null;
    let next = node.right;
    if (next !== null) { // 找左子树中最右边的节点
        while (next.left !== null) {
            next = next.left;
        }
        return next;
    }
    // 当前父节点存在，并且你是父节点的左子树
    while (node.parent != null && node == node.parent.right) {
        node = node.parent;
    }
    return node.parent;
}
```
### 删除节点
```js
remove(element) {
    let node = this.node(element);
    if(node == null) return;
    this.size--;
    // 度为2的节点
    if(node.left !== null && node.right !== null){
        let pre = this.successor(node);
        node.element = pre.element;
        node = pre;
    }
    // 度为1的节点
    let replace = node.left || node.right;
    if(replace !== null){
        replace.parent = node.parent;
        if(node.parent == null){
            this.root = replace;
        }else if(node == node.parent.left){
            node.parent.left = replace;
        }else{
            node.parent.right = replace;
        }
        // 根节点
    }else if(node.parent == null){
        this.root  = null;
        // 叶子节点
    }else{
        if(node == node.parent.left){
            node.parent.left = null;
        }else{
            node.parent.right = null;
        }
    }
}
```