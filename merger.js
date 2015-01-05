(function(global) {
  var hasOwn = Object.prototype.hasOwnProperty;
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

  var getDPICompatContext = function(width, height, canvas) {
    canvas = canvas || document.createElement('canvas');

    var context = canvas.getContext('2d');
    var pixelRatio = 1;
    var canvasWidth = width;
    var canvasHeight = height;
    var devicePixelRatio = PIXEL_RATIO;
    var backingStoreRatio = getBackingStoreRatio(context);

    if (devicePixelRatio !== backingStoreRatio) {
      pixelRatio = devicePixelRatio / backingStoreRatio;

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

    if (!(window.File && file instanceof window.File)) {
      makeError('[file] in not a File');
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

  // #############################

  var ImageMerger = function(options) {
    if (!options) throw new TypeError('Argument [options] is required');

    var self = this;
    var file = options.file;
    var output = getElement(options.output);
    var onError = options.onError;
    var width = options.width;

    this.saveMemory = !!options.saveMemory;
    this.returnAsString = !!options.returnAsString;
    this.query = options.query || '';
    this.filename = options.filename;
    this.imageQuality = options.imageQuality;
    this.followPixelRatio = !!options.followPixelRatio;
    this.zoom = options.zoom;

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

      if (typeof zoom !== 'number' || !isFinite(zoom)) {
        zoom = this.followPixelRatio ? (1 / PIXEL_RATIO) : 1;
      }

      if (zoom !== 1) {
        width *= zoom;
        height *= zoom;
      }

      if (this.followPixelRatio) {
        var context = getDPICompatContext(width, height);
        var canvas = context.canvas;
      } else {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;
      }

      context.drawImage(
        img,
        0, 0, img.naturalWidth, img.naturalHeight,
        0, 0, width, height
      );

      this.output = output;
      this.context = context;
      this.image = img;
      this.viewWidth = width;
      this.viewHeight = height;

      output.innerHTML = '';

      if (this.saveMemory) {
        img.width = width;
        img.height = height;

        var container = document.createElement('div');

        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        container.style.width = width + 'px';
        container.style.height = height + 'px';
        container.appendChild(img);

        this.saveMemoryContainer = container;

        output.appendChild(container);
      } else {
        output.appendChild(canvas);
      }
    },

    addImage: function(image, x, y) {
      var output = this.output;
      // Cannot do anything while file is not read
      if (!output) return;

      var rect = output.getBoundingClientRect();
      var self = this;

      var draw = function(image) {
        var left = x - image.width / 2;
        var top = y - image.height / 2;

        self.context.drawImage(
          image,
          0, 0, image.naturalWidth, image.naturalHeight,
          left, top, image.width, image.height
        );

        if (self.saveMemory) {
          var clone = image.cloneNode();

          clone.width = image.width;
          clone.height = image.height;

          clone.style.position = 'absolute';
          clone.style.left = left + 'px';
          clone.style.top = top + 'px';

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
          var file = new File([blob], filename, {
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