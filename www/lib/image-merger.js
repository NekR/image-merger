(function(global) {
  var hasOwn = Object.prototype.hasOwnProperty;
  var NativeFile = window.File;

  var ext2type = {
    gif: 'image/gif',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg'
  };

  var PIXEL_RATIO = window.devicePixelRatio ||
                    window.webkitDevicePixelRatio ||
                    window.mozDevicePixelRatio ||
                    window.msDevicePixelRatio || 1;

  var getElement = function(elem) {
    if (typeof elem === 'string') {
      return document.querySelector(elem);
    }

    // assume "elem" here is Node, no special check
    return elem;
  };

  var getImage = function(image, callback) {
    if (typeof image === 'string') {
      var src = image;

      image = new Image();
      image.onload = function() {
        callback(image);
      };

      image.src = src;
      return;
    }

    if (image.complete) {
      callback(image);
    } else {
      image.onload = function() {
        callback(image);
      };
    }
  };

  var getBackingStoreRatio = function(context) {
    return context.backingStorePixelRatio ||
           context.webkitBackingStorePixelRatio ||
           context.mozBackingStorePixelRatio ||
           context.msBackingStorePixelRatio || 1;
  };

  var getDPICompatContext = function(width, height, canvas, dpi) {
    canvas = canvas || document.createElement('canvas');
    dpi = dpi || PIXEL_RATIO;

    var context = canvas.getContext('2d');
    var pixelRatio = 1;
    var canvasWidth = width;
    var canvasHeight = height;
    var backingStoreRatio = getBackingStoreRatio(context);

    if (dpi !== backingStoreRatio) {
      pixelRatio = dpi / backingStoreRatio;

      canvasWidth = width * pixelRatio;
      canvasHeight = height * pixelRatio;

      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    }

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    context.scale(pixelRatio, pixelRatio);

    return context;
  };

  var getTypeByExt = function(name) {
    var dotIndex = name.lastIndexOf('.');

    if (dotIndex === -1) {
      return '';
    }

    var ext = name.slice(dotIndex + 1);

    if (hasOwn.call(ext2type, ext)) {
      return ext2type[ext];
    }

    return '';
  };

  var readFileAsImage = function(file, callback, errback) {
    var reader = new FileReader();
    var hasError;

    var makeError = function(err) {
      if (hasError) return;
      hasError = true;

      if (typeof errback === 'function') {
        errback(err);
      }
    };

    if (!(
      (NativeFile && file instanceof NativeFile) ||
      (window.File && file instanceof window.File)
    )) {
      makeError('[file] is not a File');
      return;
    }

    reader.onload = function() {
      var result = this.result;
      var image = new Image();

      if (!file.type) {
        var type = getType(file.name.toLowerCase());
        var index = result.indexOf('data:base64');

        if (type && index === 0) {
          result = 'data:' + type + ';' + result.slice(5);
        } else if (index === 0) {
          makeError('Cannot read as Image: FileReader loaded successfully,' +
                    'but file.type was not present and type was not detect' +
                    'by file extension');
          return;
        }
      }

      image.onload = function() {
        callback(image);
      };

      image.onerror = function() {
        makeError('Image loading error');
      };

      image.src = result;
    };

    reader.onerror = function() {
      makeError('FileReader error: ' + reader.error.name);
    };

    reader.readAsDataURL(file);
  };

  var cordovaUpload = function(file, params, callback, errback) {
    var options = new FileUploadOptions();

    var query = params.query || 'file';
    var method = params.method;

    options.fileKey = query;
    options.fileName = file.name;
    options.mimeType = file.type;

    if (method) {
      options.httpMethod = method;
    }

    var ft = new FileTransfer();

    ft.upload(file.localURL, encodeURI(params.url), function(data) {
      if (data.responseCode < 200 || data.responseCode >= 300) {
        errback();
        return;
      }

      callback(data.response);
    }, function(err) {
      errback(err);
    }, options);
  };

  var nativeUpload = function(file, params, callback, errback) {
    var xhr = new XMLHttpRequest();
    var data = new FormData();

    var method = (params.method || '').toUpperCase();
    var query = params.query || 'file';

    var onError = function() {
      errback();

      xhr.onerror = xhr.onload = xhr.onabort = null;
    };

    if (method !== 'PUT') {
      method = 'POST';
    }

    // If "file" is a string, then "file.name" is undefined as should be
    data.append(query, file, file.name);

    xhr.open(method, params.url, true);
    xhr.responseType = 'text';

    xhr.onload = function() {
      if (xhr.status < 200 || xhr.status >= 300) {
        onError();
        return;
      }

      callback(xhr.response);
    };

    xhr.onerror = onError;
    xhr.onabort = onError;

    xhr.send(data);
  };

  var getFileFromFS = function(blob, callback, errback) {
    window.requestFileSystem(window.TEMPORARY, blob.size + 1, function(fs) {
      fs.root.getFile(blob.name, { create: true }, function(fileEntry) {
        fileEntry.createWriter(function(fileWriter) {
          fileWriter.onwriteend = function() {
            fileEntry.file(callback, errback);
          };

          fileWriter.onerror = errback;
          fileWriter.write(blob);
        }, errback);
      }, errback);
    }, errback);
  };

  // #############################

  var ImageMerger = function(options) {
    if (!options) throw new TypeError('Argument [options] is required');

    var self = this;
    var file = options.file;
    var output = getElement(options.output);
    var onError = options.onError;
    var width = options.width;
    var zoom = options.zoom;

    this.saveMemory = !!options.saveMemory;
    this.returnAsString = !!options.returnAsString;
    this.filename = options.filename;
    this.imageQuality = options.imageQuality;
    this.dpi = isFinite(options.dpi) ? options.dpi : 'auto';
    this.zoom = typeof zoom !== 'number' || !isFinite(zoom) ? 1 : zoom;

    readFileAsImage(file, function(img) {
      self.initPlot(output, img, width);
    }, function(e) {
      if (onError) {
        onError(e);
      } else {
        throw new Error(e);
      }
    });
  };

  ImageMerger.prototype = {
    initPlot: function(output, img, width) {
      var ratio = 1;
      var height;

      if (isFinite(width)) {
        ratio = img.naturalWidth / width;
        height = img.naturalHeight / ratio;
      } else {
        width = img.naturalWidth;
        height = img.naturalHeight;
      }

      var zoom = this.zoom;
      var dpi = this.dpi;

      var viewWidth = width;
      var viewHeight = height;

      var context = getDPICompatContext(width, height, null, dpi);
      var canvas = context.canvas;

      if (zoom !== 1) {
        viewWidth *= zoom;
        viewHeight *= zoom;
      }

      context.drawImage(
        img,
        0, 0, img.naturalWidth, img.naturalHeight,
        0, 0, width, height
      );

      this.output = output;
      this.context = context;
      this.image = img;
      this.viewWidth = viewWidth;
      this.viewHeight = viewHeight;
      this.width = width;
      this.height = height;

      output.innerHTML = '';

      if (this.saveMemory) {
        img.width = viewWidth;
        img.height = viewHeight;

        var container = document.createElement('div');

        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.style.width = viewWidth + 'px';
        container.style.height = viewHeight + 'px';
        container.appendChild(img);

        this.saveMemoryContainer = container;

        output.appendChild(container);
      } else {
        if (zoom !== 1) {
          canvas.style.width = viewWidth + 'px';
          canvas.style.height = viewHeight + 'px';
        }

        output.appendChild(canvas);
      }
    },

    addImage: function(image, x, y, width, height) {
      var output = this.output;
      // Cannot do anything while file is not read
      if (!output) return;

      var rect = output.getBoundingClientRect();
      var self = this;

      width = width || image.width;
      height = height || image.height;

      var draw = function(image) {
        var left = x - width / 2;
        var top = y - height / 2;

        self.context.drawImage(
          image,
          0, 0, image.naturalWidth, image.naturalHeight,
          left, top, width, height
        );

        if (self.saveMemory) {
          var clone = image.cloneNode();
          var zoom = self.zoom;

          clone.className = clone.id = '';

          clone.width = width * zoom;
          clone.height = height * zoom;

          clone.style.position = 'absolute';
          clone.style.left = left * zoom + 'px';
          clone.style.top = top * zoom + 'px';

          self.saveMemoryContainer.appendChild(clone);
        }
      };

      getImage(image, draw);
    },

    getFile: function(callback) {
      var self = this;
      var filename = this.filename;
      var type = getTypeByExt(filename);
      var quality;

      if (type === 'image/jpeg') {
        quality = this.imageQuality;
      } else if (type !== 'image/png') {
        type = 'image/png';
      }

      if (this.returnAsString) {
        var image = this.context.canvas.toDataURL(type, quality);

        setTimeout(function() {
          callback(image);
        }, 1);

        return;
      }

      this.context.canvas.toBlob(function(blob) {
        var data = new FormData();

        try {
          var file = new NativeFile([blob], filename, {
            type: type
          });
        } catch (e) {
          blob.name = filename;
          blob.type = type;

          file = blob;
        }

        callback(file);
      }, type, quality);
    },

    upload: function(params, callback, errback) {
      var self = this;

      var doUpload = function(file) {
        if (file instanceof Blob /* or NativeFile */) {
          nativeUpload(file, params, callback, doError);
        } else {
          cordovaUpload(file, params, callback, doError);
        }
      };

      var doError = function(e) {
        errback('Some error occurred [' + e + ']');
      };

      self.getFile(function(file) {
        if (
          !self.returnAsString &&
          file instanceof Blob && !(file instanceof NativeFile) &&
          window.requestFileSystem
        ) {
          getFileFromFS(file, doUpload, doError);
        } else {
          doUpload(file);
        }
      });
    },

    getFormData: function(callback) {
      var self = this;

      self.getFile(function(file) {
        var data = new FormData();

        // If "file" is a string, then "file.name" is undefined as should be
        data.append(self.query, file, file.name);
        callback(data);
      });
    }
  };

  global.ImageMerger = ImageMerger;
}(this));