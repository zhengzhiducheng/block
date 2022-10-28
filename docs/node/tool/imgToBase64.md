### 图片转 base64

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>

  <body>
    <img src="" alt="" id="testImg" />
    <script>
      /**
       * ⽹络图像⽂件转Base64
       */
      function getBase64Image(img) {
        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, img.width, img.height);
        var ext = img.src.substring(img.src.lastIndexOf(".") + 1).toLowerCase();
        var dataURL = canvas.toDataURL("image/" + ext);
        return dataURL;
      }
      /**
       *Base64字符串转⼆进制
       */
      function dataURLtoBlob(dataurl) {
        var arr = dataurl.split(","),
          mime = arr[0].match(/:(.*?);/)[1],
          bstr = atob(arr[1]),
          n = bstr.length,
          u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {
          type: mime,
        });
      }
      var img = "./img5.jpg";
      var image = new Image();
      image.src = img;
      image.onload = function () {
        //这样就获取到了⽂件的Base64字符串
        var base64 = getBase64Image(image);
        console.log(base64);
        document.getElementById("testImg").src = base64;
        //Base64字符串转⼆进制
        var file = dataURLtoBlob(base64);
        console.log(file);
      };
    </script>
  </body>
</html>
```
