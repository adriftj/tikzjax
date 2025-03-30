import { loadEngine, render, renderScripts } from './tikzjax';

const tikzjax = { loadEngine, render, renderScripts };

const isBrowser = typeof window !== 'undefined';
let needInit = false;

if (isBrowser) {
  // check if load by <script>
  const isScriptTag = Array.from(document.getElementsByTagName('script'))
    .some(script => script.src && script.src.includes('tikzjax'));
  
  if (isScriptTag) {
    // check if import by <script type='module'>
    const isEsModule = Array.from(document.getElementsByTagName('script'))
      .some(script => script.type === 'module' && script.src && script.src.includes('tikzjax'));
    needInit = !isEsModule;
  }
}

if (needInit) {
  window.tikzjax = tikzjax;
  let loadPromise = loadEngine();
  document.addEventListener("DOMContentLoaded", function () {
    loadPromise.then(function(){
      renderScripts(document);
    });
  });
}

export default tikzjax;
