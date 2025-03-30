import { dvi2html } from 'dvi2html';
import { Writable } from 'readable-stream';
import * as library from './library';
import pako from 'pako';
import fetchStream from 'fetch-readablestream';

let pages = 2500;
var coredump = undefined;
var code = undefined;

export async function loadEngine(urlPrefix) {
  if(coredump)
    return;

  if(urlPrefix===undefined)
    urlPrefix = window.location.origin + '/wasm';

  let tex = await fetch(urlPrefix + '/tex.wasm');
  code = await tex.arrayBuffer();

  let response = await fetchStream(urlPrefix + '/core.dump.gz');
  const reader = response.body.getReader();
  const inf = new pako.Inflate();
  
  try {
    while (true) {
      const {done, value} = await reader.read();
      inf.push(value, done);
      if (done) break;
    }
  }
  finally {
    reader.releaseLock();
  }

  coredump = new Uint8Array(inf.result, 0, pages*65536);
}

function copy(src)  {
  var dst = new Uint8Array(src.length);
  dst.set(src);
  return dst;
}

function tex(input) {
  if (input.match('\\\\begin *{document}') === null) {
    input = '\\begin{document}\n' + input;
  }
  input = input + '\n\\end{document}\n';

  library.deleteEverything();
  library.writeFileSync("sample.tex", Buffer.from(input));
  let memory = new WebAssembly.Memory({initial: pages, maximum: pages});
  let buffer = new Uint8Array( memory.buffer, 0, pages*65536 );
  buffer.set(copy(coredump));
  library.setMemory(memory.buffer);
  library.setInput("sample.tex \n\\end\n");

  var module = new WebAssembly.Module(code);
  var wasm = new WebAssembly.Instance(module, { library: library,
                                            env: { memory: memory } } );

  const wasmExports = wasm.exports;
  library.setWasmExports( wasmExports );
  wasm.exports.main();

  return library.readFileSync( "sample.dvi" );
}

const rxCssWidth = new RegExp(/width:[ \t0-9.%pt]*;/);
const rxCssHeight = new RegExp(/height:[ \t0-9.%pt]*;/);
const rxSvgWidth = new RegExp(/width="[0-9.in]*"/);
const rxSvgHeight = new RegExp(/height="[0-9.in]*"/);
const rxSvgViewBox = new RegExp(/viewBox="[0-9. \t]*"/);

export function render(text) {
  if (coredump == undefined)
    throw "tex wasm hasn't loaded";
  let dvi = tex(text);
  let html = "";  
  const page = new Writable({
    write(chunk, _, callback) {
      html = html + chunk.toString();
      callback();
    }
  });

  let machine = dvi2html( Buffer.from(dvi), page );
  let w = machine.paperwidth.toString();
  let h = machine.paperheight.toString();
  /* `html` will be start with:
  <div style="position: relative; width: 100%; height: 17.08821105957031pt;" class="page">
  <svg width="1in" height="1in" viewBox="0 0 72 72" style="position: absolute; top: 17.08821105957031pt; left: -60.02537536621092pt; overflow: visible;">
  we need replace width, height, viewbox will `w`, `h`
  */
  return {
    width: machine.paperwidth,
    height: machine.paperheight,
    html: html.replace(rxCssWidth, 'width: '+w+'pt;')
             .replace(rxCssHeight, 'height: '+h+'pt;')
             .replace(rxSvgWidth, 'width='+w+'pt')
             .replace(rxSvgHeight, 'height='+h+'pt')
             .replace(rxSvgViewBox, 'viewBox="-72 -72 '+w+' '+h+'"')
  };
}

export function renderScripts(root){
  var scripts = root.getElementsByTagName('script');
  var tikzScripts = Array.prototype.slice.call(scripts).filter(
    (e) => (e.getAttribute('type') === 'text/tikz'));
  tikzScripts.reduce((_, elt) => {
    var text = elt.childNodes[0].nodeValue;
    var div = document.createElement('div');
    let {width, height, html} = render(text);
    div.style.display = 'flex';
    div.style.width = width.toString() + "pt";
    div.style.height = height.toString() + "pt";
    div.innerHTML = html;
    elt.parentNode.replaceChild(div, elt);
  }, 0);
};
