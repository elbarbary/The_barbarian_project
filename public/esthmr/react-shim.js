/* Just enough React for the design's charts.
 *
 * `spark()` and `buildChart()` came over from the canvas as
 * `React.createElement` trees — that is how the design tool draws SVG. Pulling
 * in React to render two charts would be absurd, and rewriting them by hand
 * would fork them from the design. So this builds real DOM from the same
 * calls: same source, no dependency.
 */
const SVG = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'path', 'line', 'g', 'defs', 'linearGradient',
  'stop', 'circle', 'rect', 'text', 'polyline', 'polygon', 'ellipse', 'clipPath']);

// SVG attributes are hyphenated; the design writes them the way JSX does.
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function styleText(style) {
  return Object.entries(style)
    .map(([k, v]) => `${kebab(k)}:${typeof v === 'number' && !/opacity|zIndex|flex|lineHeight/.test(k) ? v + 'px' : v}`)
    .join(';');
}

function append(parent, child) {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) { child.forEach((c) => append(parent, c)); return; }
  parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
}

export const React = {
  createElement(tag, props, ...children) {
    const el = SVG_TAGS.has(tag)
      ? document.createElementNS(SVG, tag)
      : document.createElement(tag);
    for (const [name, value] of Object.entries(props || {})) {
      if (value === null || value === undefined || value === false) continue;
      if (name === 'key' || name === 'ref') continue;
      if (name === 'style' && typeof value === 'object') {
        el.setAttribute('style', styleText(value));
      } else if (name === 'className') {
        el.setAttribute('class', String(value));
      } else {
        el.setAttribute(kebab(name), String(value));
      }
    }
    children.forEach((child) => append(el, child));
    return el;
  },

  isValidElement(value) {
    return value instanceof Node;
  },
};

export default React;
