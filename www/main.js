var initApp = function() {
  var output = document.getElementById('output');
  var images = document.getElementById('images');
  var send = document.getElementById('send');
  var link = document.getElementById('link');
  var merger;

  var chooserButton = document.getElementById('choose');
  var chosenOutput = document.getElementById('chosen');

  var isAndroid = window.device && device.platform.toLowerCase() === 'android';
  var androidFileChooser = isAndroid && window.fileChooser;

  var type2ext = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif'
  };

  var logError = function() {
    if (window.console) {
      console.log.apply(console, arguments);
    } else {
      alert(Array.prototype.slice.call(arguments).map(function(item) {
        if (typeof item !== 'string' && item) {
          try {
            item = JSON.stringify(item, null, '  ');
          } catch (e) {}
        }

        return item;
      }).join(' '));
    }
  };

  var createChooser = function(type, callback, errback) {
    if (androidFileChooser) {
      createAndroidChooser(type, callback, errback);
    } else {
      createNativeChooser(type, callback, errback);
    }
  };

  var createAndroidChooser = function(type, callback, errback) {
    chooserButton.onclick = function(e) {
      e.preventDefault();

      androidFileChooser.pick(type, function(data) {
        var url = data.url;
        var filename = data.filename;

        resolveLocalFileSystemURL(url, function(entry) {
          if (entry.isFile) {
            entry.file(function(file) {
              chosenOutput.textContent = filename || getFileName(file);
              callback(file);
            }, errback);
          } else {
            errback('Not a file');
          }
        }, errback);
      }, errback);
    };
  };

  var createNativeChooser = function(type, callback, errback) {
    chooserButton.style.position = 'relative';
    chooserButton.style.overflow = 'hidden';

    if (type === 'image' || type === 'audio' || type === 'video') {
      type = type + '/*';
    } else {
      type = '*/*';
    }

    var prevInput;

    var createInput = function() {
      var input = document.createElement('input');

      input.type = 'file';
      input.setAttribute('accept', type);
      input.accept = type;
      input.setAttribute('capture', 'camera');

      input.onchange = function() {
        if (!input.files || !input.files.length) {
          errback();
          return;
        }

        var file = input.files[0];
        chosenOutput.textContent = getFileName(file);
        createInput();

        callback(file);
      };

      if (prevInput && prevInput.parentNode) {
        prevInput.parentNode.removeChild(prevInput);
      }

      prevInput = input;

      input.style.position = 'absolute';
      input.style.top = input.style.left = 0;
      input.style.width = input.style.height = '500px';
      input.style.fontSize = chooserButton.offsetHeight * 1.5 + 'px';
      input.style.opacity = 0;

      chooserButton.appendChild(input);
    };

    createInput();
  };

  var getFileName = function(file) {
    if (file.name.indexOf('.') !== -1) {
      return file.name;
    }

    var ext = type2ext[file.type];

    if (ext) {
      return file.name + '.' + ext;
    }

    return file.name;
  };

  createChooser('image', function(file) {
    read(file)
  }, function(e) {
    logError('Choose error:', e);
  });

  var read = function(file) {
    if (!file) return;

    link.hidden = true;
    link.innerHTML = '';

    var zoom = window.innerWidth < 640 ? 0.5 : 1;

    merger = new ImageMerger({
      output: output,
      file: file,
      filename: 'file.png',
      dpi: 1,
      width: 640,
      zoom: zoom,

      onError: function(e) {
        logError('Error:', e);
      }
    });

    initImages(merger);
    initSend(merger);
  };

  var random = function(max) {
    return Math.floor(Math.random() * max);
  };

  var openLink = function(e) {
    if (!window.device) return;
    e.preventDefault();

    var a = this;

    if (isAndroid && navigator.app && navigator.app.loadUrl) {
      navigator.app.loadUrl(a.href, {
        openExternal : true
      });
    } else {
      window.open(a.href, '_system');
    }
  };

  var initImages = function(merger) {
    images.hidden = false;

    var items = images.querySelectorAll('img');

    Array.prototype.slice.call(items).forEach(function(item) {
      item.onmousedown = item.ontouchstart = function(e) {
        e.preventDefault();

        merger.addImage(item, random(merger.width), random(merger.height), 128, 128);
      };
    });
  };

  var initSend = function(merger) {
    send.hidden = false;

    send.onclick = function(e) {
      e.preventDefault();

      var prevCont = send.textContent;
      send.textContent = 'Loading ...';
      send.disabled = true;

      var loaded = function() {
        send.textContent = prevCont;
        send.disabled = false;
      };

      var onLoaded = function(response) {
        loaded();

        try {
          if (typeof response === 'string') {
            response = JSON.parse(response);
          }
        } catch (e) {};

        var url = response && (response.url || (response.data && response.data.img_url));

        if (!url) {
          logError('Error:', response);
          return;
        }

        var a = document.createElement('a');

        a.href = url;
        a.target = '_blank';
        a.textContent = 'Open Image in a Browser';
        a.onclick = openLink;

        link.hidden = false;
        link.innerHTML = '';
        link.appendChild(a);
      };

      merger.upload({
        // url: 'http://deviantsart.com',
        url: 'http://uploads.im/api',
        query: 'upload',
        method: 'POST'
      }, onLoaded, function(e) {
        loaded();
        logError('Error:', e);
      });
    };
  };
};

document.addEventListener('deviceready', function() {
  initApp();
}, false);