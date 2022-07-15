### 链表反转
```js
reverseList(){
    function reverse(head){
        if(head == null || head.next == null) return head;
        let newHead = reverse(head.next);
        head.next.next = head;
        head.next = null;
        return newHead;
    }
    this.head = reverse(this.head);
    return this.head 
}
```