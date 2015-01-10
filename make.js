require('shelljs/make');

target.init = function() {
  target.clean();

  exec('cordova create ./app com.imagemerger.image-merger "Image Merger"', function(code) {
    if (code) return;

    target.copy();
    target.plugins();
  });
};

target.copy = function() {
  rm('-rf', './app/www');
  cp('-rf', './www/', './app/www/');
  cp('-f', './config.xml', './app/config.xml');
};

target.plugins = function() {
  var curDir = pwd();

  console.log('Installing plugins...');

  cd('./app');
  exec('cordova plugin add org.apache.cordova.device');
  exec('cordova plugin add org.apache.cordova.file');
  exec('cordova plugin add org.apache.cordova.file-transfer');
  exec('cordova plugin add org.apache.cordova.inappbrowser');
  exec('cordova plugin add org.apache.cordova.statusbar');
  exec('cordova plugin add https://github.com/NekR/cordova-filechooser.git');
  cd(curDir);
};

target.clean = function() {
  rm('-rf', './app');
};