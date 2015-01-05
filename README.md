# ImageMerger Library
ImageMerger provided as library file and depends only on this polyfill --
[Canvas-to-Blob](https://github.com/blueimp/JavaScript-Canvas-to-Blob), this polyfill is included in archive. Also I have included there one example.

## Docs
To stat work with ImageMerger, first need to initialize it. This is initialization snippet from attached example:

```javascript
input.addEventListener('change', function() {
	var file = input.files[0];

	var merger = new ImageMerger({
	    // required
		output: output,
		file: file,
		filename: 'file.png',
		
		// optional
		query: 'upload',
		followPixelRatio: true,
		width: 600,

		onError: function(e) {
			console.log('Error:', e);
		}
	});
});
```
ImageMerger constructor takes object as its first argument.
### Required fields
* **output**:  HTMLElement or selector string which will be passed to ```querySelector``` method. Indicates element-container for merger.
* **file**: File object, usually comes from ```input.files``` field, but of course not limited to it. Should be image, if it's not then error will occur.
* **filename**: Indicates file name of resulting image. If extensions does not match image extensions or browser do not support such tape of image, then error might be thrown. Most usual formats are PNG and JPEG.

### Optional fields
* **width**: Width of output image, if not specified will you ```naturalWidth``` of given file. Height always comes from ```naturalHeight``` of given file and scales on passed width.
* **query**: Indicates key for ```FormData``` entry. Used in ```ImageMerger.getFormData``` method.
* **followPixelRatio**: If ```true``` then backing-store of canvas will be adapted to device-pixel-ratio. In practice, this means that canvas image will be multiplied by ```devicePixelRatio``` value. So if  ```devicePixelRatio``` is 2 and given file dimensions are 800x600, then output image will have dimensions 1600x1200. _Default_: ```false```
* **zoom**: Indicates how to zoom given file, 1 means 100%. _Default_: ```1``` if ```followPixelRatio``` is false and ```1 / devicePixelRatio``` if ```followPixelRatio``` is true.
* **imageQuality**: Output image quality. Has no effect to formats like PNG, usually used with JPEG. _Default_: ```undefined``.
* **returnAsString**: If true, output image will be returned as DataURL string, not as Blob/File object. Has effect to methods ```ImageMerger.getFile``` and ```ImageMerger.getFormData```. _Default_: false.
* **saveMemory**: If true then instead of canvasa element itself, DOM images will be passed to ```output``` element. This might save memory on devices like phones. Output image still will be generated from off-shore canvas. _Default_: false
* **onError**: If present, method will be called with text error as a first argument. If not, error will thrown.

### Instance methods
* **addImage(image, x, y)**: Takes 3 arguments. First argument image, might be either url to image on ```HTMLImageElement```, two other are x and y coordinates of overlapping image respectively.
* **getFile(function callback(file) {})**: Taken one argument ```callback``` and invokes it with ```file``` argument. ```file``` might be of type ```Blob/File``` or ```string``` if ```returnAsString``` option is ```true```.
* **getFormData(function callback(formData) {})**: aken one argument ```callback``` and invokes it with ```formData``` argument. Uses ```getFile``` inside of it, therefore also depends on ```returnAsString``` option. ```formData``` will have one entry with key equal to ```query``` option passed to ```ImageMerger``` constructor and values as returned image (either ```Blob/File``` or ```string```).

## Implementation details
To use this library on mobile device or devices if pixel ration more than 1 you need take care of dimensions and sizes. You may do this by manualy adjusting width/zoom/followPixelRatio properties. ```followPixelRatio``` fixes differences between screen densities, but size of image is mutiplied by ```devicePixelRatio```, therefore here comes usable property ```zoom``` which automatically shrink canvas by ```devicePixelRatio``` value. For example, if dimensions of given file are 800x600, then visual canvas size will be 800x600 on devices with device-pixel-ratio 1 and 400x300 on devices with device-pixel-ratio 2. But output image (uploaded to server) still will have dimensions 800x600.

## Android Default Browser
When uploading files you need take care of bug in this browser. It does not support ```File``` constructor and therefore there is not way to set name to the ```Blob```, also it has bug where passed ```filename``` for ```FromData``` entry with ```Blob``` or ```File``` content is ignored. So when you this browser send request to the server, body of it looks like this:
```
------WebKitFormBoundarySD8eA4tCOGqrq12v
Content-Disposition: form-data; name="upload"; filename="Blob40e32ce4255a4e32b376bb779ad8c7da"
Content-Type: image/png
```
With auto generated ```filename``` for uploaded file and that filename is without file extension. This brake many servers and they cannot upload file without extensions in the ```filename```. Correct server must take care of this bug and detect file type by ```Content-Type``` field of uploaded file, if file extensions is not present.

