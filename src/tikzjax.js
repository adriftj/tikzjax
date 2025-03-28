import { dvi2html } from 'dvi2html';
import { Writable } from 'readable-stream';
import * as library from './library';
import pako from 'pako';
import fetchStream from 'fetch-readablestream';

let pages = 2500;
var coredump = undefined;
var code = undefined;

export async function loadTexWasm(urlPrefix) {
  if(coredump)
    return;

  if(urlPrefix===undefined) {
    // document.currentScript polyfill
    if (document.currentScript === undefined) {
      var scripts = document.getElementsByTagName('script');
      document.currentScript = scripts[scripts.length - 1];
    }

    // Determine where we were loaded from; we'll use that to find a
    // tikzwolke server that can handle our POSTing tikz code
    var url = new URL(document.currentScript.src);
    urlPrefix = url.protocol + '//' + url.host; // host includes the port
  }

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

  coredump = new Uint8Array( inf.result, 0, pages*65536 );
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
  library.writeFileSync( "sample.tex", Buffer.from(input) );

  let memory = new WebAssembly.Memory({initial: pages, maximum: pages});

  let buffer = new Uint8Array( memory.buffer, 0, pages*65536 );
  buffer.set( copy(coredump) );

  library.setMemory( memory.buffer );
  library.setInput( " sample.tex \n\\end\n" );

  var module = new WebAssembly.Module(code);
  var wasm = new WebAssembly.Instance(module, { library: library,
                                            env: { memory: memory } } );

  const wasmExports = wasm.exports;
  library.setWasmExports( wasmExports );

  wasm.exports.main();

  return library.readFileSync( "sample.dvi" );
}

function tex2html(text) {
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
  return {machine, html};
}

export function tikzjax(root){
  if(typeof root === 'string') {
    return tex2html(root);
  }

  function process(elt){
    var text = elt.childNodes[0].nodeValue;
    var div = document.createElement('div');
    let {machine, html} = tex2html(text);
    div.style.display = 'flex';
    div.style.width = machine.paperwidth.toString() + "pt";
    div.style.height = machine.paperheight.toString() + "pt";
    //div.style['align-items'] = 'center';
    //div.style['justify-content'] = 'center';

    div.innerHTML = html;
    let svg = div.getElementsByTagName('svg');
    if (svg[0]) {
      svg[0].setAttribute("width", machine.paperwidth.toString() + "pt");
      svg[0].setAttribute("height", machine.paperheight.toString() + "pt");
      svg[0].setAttribute("viewBox", `-72 -72 ${machine.paperwidth} ${machine.paperheight}`);
    } else {
      console.error( "Missing svg element" );
    }

    elt.parentNode.replaceChild(div, elt);
  };

  var scripts = root.getElementsByTagName('script');
  var tikzScripts = Array.prototype.slice.call(scripts).filter(
    (e) => (e.getAttribute('type') === 'text/tikz'));
  tikzScripts.reduce((_, element)=>{return process(element), 0;}, 0);
};
