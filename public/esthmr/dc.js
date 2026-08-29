/* The four directives the design uses, and nothing else.
 *
 * The page was drawn in Claude Design, which renders a template with
 * `{{ expression }}` interpolation, `<sc-for>`, `<sc-if>` and `onClick`
 * bindings against a logic class. Re-implementing that markup as hand-written
 * DOM calls would fork it from the design on day one; every future change
 * would have to be translated by hand. So the template ships verbatim and this
 * reads it — 150 lines against 59 KB of design, and a re-import stays a file
 * copy.
 *
 * Rendering is a full rebuild on every state change. That sounds wasteful and
 * is not: `<sc-if>` wraps each screen, and a false branch is never walked, so
 * one render touches only the screen on show.
 */
const CACHE = new Map();

/** Compile `expr` once, evaluated with `scope`'s keys in lexical position. */
function evaluate(expr, scope) {
  let fn = CACHE.get(expr);
  if (fn === null) return '';               // known-bad, already reported
  if (!fn) {
    try {
      // Sloppy mode on purpose: `with` is what lets the design write
      // `{{ co.nameEn }}` rather than `{{ scope.co.nameEn }}`.
      fn = new Function('scope', 'with (scope) { return (' + expr + '); }');
    } catch (error) {
      // A binding that will not compile is reported once and then skipped, so
      // one bad expression cannot take the whole page down with it.
      console.warn('[dc] will not compile:', JSON.stringify(expr), error.message);
      CACHE.set(expr, null);
      return '';
    }
    CACHE.set(expr, fn);
  }
  try {
    return fn(scope);
  } catch (error) {
    console.warn('[dc] could not evaluate', expr, error.message);
    return '';
  }
}

const BINDING = /\{\{([\s\S]*?)\}\}/g;

/** A string with `{{ }}` holes filled. A lone binding keeps its real type.
 *
 * The capture must not be allowed to run past the first `}}`, or a string of
 * two bindings — `{{ L.closeOf }} {{ marketDate }}` — looks like one binding
 * whose body happens to contain braces, and compiles to nothing. */
function interpolate(text, scope, wrap) {
  const whole = text.match(/^\s*\{\{((?:(?!\}\})[\s\S])*)\}\}\s*$/);
  if (whole) {
    const value = evaluate(whole[1], scope);
    return wrap ? wrap(value) : value;
  }
  return text.replace(BINDING, (_, expr) => {
    const value = evaluate(expr, scope);
    if (value === null || value === undefined) return '';
    return String(wrap ? wrap(value) : value);
  });
}

/** Whatever the component wants done to a string BEFORE it becomes text.
 *
 * There is exactly one of these and it is Arabic bidi isolation. It used to be
 * applied to the whole of `renderVals` instead, which cannot tell a figure a
 * reader looks at from one the browser parses: the wrapping characters landed
 * inside `style` too, so every proportional bar on the site — a mover's
 * magnitude, a breadth cell, a ratio bar, a compare bar — was handed
 * `width:⁦64%⁩`, rejected it, and drew itself full width. On the Arabic
 * screens a 0.13% move and a 4% move were the same bar.
 *
 * Here it can tell: this runs on text nodes and nothing else.
 */
let TEXT = null;

function renderNode(node, scope, into) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue;
    if (text.indexOf('{{') === -1) {
      into.appendChild(document.createTextNode(text));
      return;
    }
    const value = interpolate(text, scope, TEXT);
    // A binding may resolve to a real node — the design's charts are built as
    // element trees, not strings — so it is appended rather than stringified.
    into.appendChild(value instanceof Node
      ? value
      : document.createTextNode(value === null || value === undefined ? '' : String(value)));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const tag = node.tagName.toLowerCase();

  if (tag === 'sc-if') {
    // Falsy branches are never walked, which is what keeps a full re-render of
    // an eight-screen template cheap.
    if (evaluate(node.getAttribute('value').replace(/^\s*\{\{|\}\}\s*$/g, ''), scope)) {
      for (const child of node.childNodes) renderNode(child, scope, into);
    }
    return;
  }

  if (tag === 'sc-for') {
    const list = evaluate(node.getAttribute('list').replace(/^\s*\{\{|\}\}\s*$/g, ''), scope);
    const name = node.getAttribute('as') || 'item';
    if (!Array.isArray(list)) return;
    list.forEach((item, index) => {
      const inner = Object.create(scope);
      inner[name] = item;
      inner[name + 'Index'] = index;
      for (const child of node.childNodes) renderNode(child, inner, into);
    });
    return;
  }

  const el = document.createElement(tag);
  for (const attr of node.attributes) {
    const lower = attr.name.toLowerCase();
    if (lower === 'onclick' || lower === 'onchange') {
      const handler = interpolate(attr.value, scope);
      if (typeof handler === 'function') {
        if (lower === 'onclick') {
          el.addEventListener('click', handler);
          // Something that responds to a click should look like it does.
          el.style.cursor = 'pointer';
        } else {
          // The design writes React's `onChange`, which fires per keystroke.
          // Bound to the DOM event of the same name it fires on blur or Enter
          // instead — so the Market screen's search box, its primary control,
          // did nothing at all while a reader typed into it. `input` is the
          // event React's onChange actually means; `change` stays bound for
          // the controls that only have one (a select, a checkbox).
          el.addEventListener('input', handler);
          el.addEventListener('change', handler);
        }
      }
      continue;
    }
    const value = attr.value.indexOf('{{') === -1 ? attr.value : interpolate(attr.value, scope);
    if (value === false || value === null || value === undefined) continue;
    el.setAttribute(attr.name, String(value));
  }
  for (const child of node.childNodes) renderNode(child, scope, el);
  into.appendChild(el);
}

/** Mount `template` (an HTML string) into `root`, driven by `component`. */
export function mount(templateHtml, root, component) {
  const holder = document.createElement('template');
  holder.innerHTML = templateHtml;
  const source = holder.content;

  let queued = false;
  const draw = () => {
    queued = false;
    // Set per draw rather than per call: the component may change language
    // between one render and the next.
    TEXT = typeof component.text === 'function' ? (v) => component.text(v) : null;

    // Rendering is a full rebuild, so the focused element is destroyed and
    // recreated on every keystroke — which took the caret out of the search
    // box the moment it did anything, and made refining a search a matter of
    // clicking back in each time. Remember where the caret was and put it
    // back. Matched on the field's own name rather than on identity, because
    // the element that comes back is a different one.
    const had = document.activeElement;
    const focused = had && (had.tagName === 'INPUT' || had.tagName === 'TEXTAREA')
      && root.contains(had)
      ? { at: [...root.querySelectorAll('input,textarea')].indexOf(had),
          start: had.selectionStart, end: had.selectionEnd }
      : null;

    const scope = component.scope();
    const next = document.createDocumentFragment();
    for (const child of source.childNodes) renderNode(child, scope, next);
    root.replaceChildren(next);

    if (focused && focused.at >= 0) {
      const again = root.querySelectorAll('input,textarea')[focused.at];
      if (again) {
        again.focus();
        try { again.setSelectionRange(focused.start, focused.end); } catch { /* not a text field */ }
      }
    }
  };

  component.onChange = () => {
    // Coalesce: several setState calls in one handler should draw once.
    if (queued) return;
    queued = true;
    requestAnimationFrame(draw);
  };
  draw();
  return draw;
}
