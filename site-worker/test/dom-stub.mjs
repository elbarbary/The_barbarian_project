/* Just enough DOM for the site's modules to build their pictures under
 * `node --test`.
 *
 * The site's logic is a browser module, and the reason its bugs reached
 * production is that nothing ever ran it outside a browser. This is the
 * smallest thing that lets a test call `renderVals()`, and it grows only when
 * a real module needs something it does not have — it is meant to fail loudly
 * rather than to pretend.
 */
class TokenList {
  constructor(node) { this.node = node; }
  get set() {
    return new Set(String(this.node.attrs.class || '').split(/\s+/).filter(Boolean));
  }
  write(set) { this.node.attrs.class = [...set].join(' '); }
  add(name) { const s = this.set; s.add(name); this.write(s); }
  remove(name) { const s = this.set; s.delete(name); this.write(s); }
  contains(name) { return this.set.has(name); }
  toggle(name, on) {
    const want = on === undefined ? !this.contains(name) : !!on;
    if (want) this.add(name); else this.remove(name);
    return want;
  }
}

class StubNode {
  constructor(tag) {
    this.tag = tag; this.attrs = {}; this.children = []; this.style = {};
    this.dataset = {}; this.events = {};
  }
  setAttribute(name, value) { this.attrs[name] = value; }
  // A real element can be asked what it was given. Without this a test can
  // watch the shim set an attribute and never check WHICH — which is how a
  // `viewBox` hyphenated into nothing survived every chart the site drew.
  getAttribute(name) { return name in this.attrs ? this.attrs[name] : null; }
  // `className` and `class` are the same attribute, and modules set both.
  // Kept in one place so a test reading `attrs.class` sees what a module
  // assigned through the property, and `classList` agrees with both.
  get className() { return this.attrs.class || ''; }
  set className(value) { this.attrs.class = String(value); }
  get classList() { return new TokenList(this); }
  appendChild(child) { this.children.push(child); return child; }
  append(...kids) { kids.forEach((k) => this.appendChild(k)); }
  removeChild(child) {
    const at = this.children.indexOf(child);
    if (at >= 0) this.children.splice(at, 1);
    return child;
  }
  get firstChild() { return this.children[0] || null; }
  get textContent() { return this._text || ''; }
  // Assigning textContent replaces everything inside, which is how the
  // modules here clear a node before redrawing it.
  set textContent(value) { this._text = String(value); this.children = []; }
  get text() { return this._text || ''; }
  addEventListener(name, fn) { this.events[name] = fn; }
  querySelector(tag) {
    if (this.tag === tag) return this;
    for (const child of this.children) {
      const hit = child.querySelector && child.querySelector(tag);
      if (hit) return hit;
    }
    return null;
  }
}

export function installDom() {
  globalThis.Node = StubNode;
  globalThis.document = {
    createElement: (tag) => new StubNode(tag),
    createElementNS: (_ns, tag) => new StubNode(tag),
    createTextNode: (text) => Object.assign(new StubNode('#text'), { _text: text }),
  };
}
