import { loadEngine, render, renderScripts } from './tikzjax';

(function(root, factory) {
  // check AMD (RequireJS)
  if (typeof define === 'function' && define.amd) {
      // AMD. Register as anonymous module
      define([], factory);
  } 
  // check CommonJS(Node.js)
  else if (typeof module === 'object' && module.exports) {
      // Node.
      module.exports = factory();
  } 
  // browser(root is window normally)
  else {
      root.tikzjax = factory();
      let loadPromise = loadEngine();
      document.addEventListener("DOMContentLoaded", function () {
        loadPromise.then(function(){
          renderScripts(document);
        });
      });
  }
}(typeof self !== 'undefined' ? self : this, function() {
  return {
      loadEngine,
      render,
      renderScripts
  };
}));
