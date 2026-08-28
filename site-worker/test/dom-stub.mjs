/* Just enough DOM for react-shim.js to build its two charts under `node --test`.
 *
 * The site's logic is a browser module, and the reason its bugs reached
 * production is that nothing ever ran it outside a browser. This is the
 * smallest thing that lets a test call `renderVals()` — twelve lines against a
 * headless-browser dependency, and it fails loudly if the shim ever needs more.
 */
class StubNode {
  constructor(tag) { this.tag = tag; this.attrs = {}; this.children = []; }
  setAttribute(name, value) { this.attrs[name] = value; }
  appendChild(child) { this.children.push(child); return child; }
}

export function installDom() {
  globalThis.Node = StubNode;
  globalThis.document = {
    createElement: (tag) => new StubNode(tag),
    createElementNS: (_ns, tag) => new StubNode(tag),
    createTextNode: (text) => Object.assign(new StubNode('#text'), { text }),
  };
}
