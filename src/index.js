import { loadTexWasm, tikzjax } from './tikzjax';
window.tikzjax = tikzjax;
let loadPromise = loadTexWasm();
document.addEventListener("DOMContentLoaded", function () {
  loadPromise.then(function(){
    tikzjax(document);
  });
});
