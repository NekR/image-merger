document.addEventListener('DOMContentLoaded', function() {
  var event = new Event('deviceready', {
    bubbles: false,
    cancelable: false
  });

  document.dispatchEvent(event);
}, false);