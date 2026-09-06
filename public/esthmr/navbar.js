/* The bottom bar follows the VISUAL viewport, not the layout one.
 *
 * Measured on an iPhone in Safari: flick the page and the bar strands itself
 * up to 124 points above the bottom edge — a sixth of a 754-point screen —
 * then snaps back when the scroll settles. That is what "the nav flies to the
 * middle of the screen" is.
 *
 * The cause is not our CSS. `position: fixed; bottom: 0` resolves against the
 * LAYOUT viewport, and Safari grows the layout viewport from 714 to 754 as its
 * own toolbar collapses under a scroll — but it only re-resolves fixed
 * elements once the gesture ends. For the whole of the flick the bar is
 * anchored to a bottom edge that is no longer where the screen ends.
 *
 * So the bar is corrected by the difference between the two viewports. When
 * they agree the offset is zero and this does nothing at all, which is every
 * desktop browser and Android.
 *
 * `visualViewport` events do not fire reliably during momentum on iOS, so the
 * correction also runs on a frame loop — but only while a scroll is in
 * flight, and it stops itself a beat after the last scroll event. Nothing
 * runs while the page is still.
 */

const QUIET_MS = 350;
// Nothing legitimate needs more than this, and a clamp means a browser that
// reports something strange cannot fling the bar off the page.
const LIMIT = 240;

export function pinBottomBar(selector = '.om-rail', phone = '(max-width: 860px)') {
  const vv = window.visualViewport;
  // No visualViewport is not a failure: it means the browser has one viewport,
  // which is the case this correction exists to undo.
  if (!vv || typeof window.matchMedia !== 'function') return () => {};

  const narrow = window.matchMedia(phone);
  let frame = 0;
  let until = 0;
  let shift = 0;

  /* Measure, then close the distance.
   *
   * The first attempt at this computed where the bar OUGHT to be, from
   * `visualViewport` against `documentElement.clientHeight`. That got the
   * baseline wrong — iOS resolves a fixed element against `innerHeight`, which
   * is the larger of the two — and pushed the bar 30px BELOW the screen, with
   * the labels cut off. Predicting which viewport a browser anchors to is not
   * something worth being clever about.
   *
   * So nothing is predicted. The bar's real position is read back, including
   * whatever transform is already on it, and the gap to the bottom of what the
   * eye can see is added to that transform. A correct position measures zero
   * and changes nothing; a wrong one is corrected in a single frame, whichever
   * direction it is wrong in.
   */
  const place = () => {
    const bar = document.querySelector(selector);
    if (!bar) return;
    if (!narrow.matches) {
      // On a wide screen the rail is a sidebar down the side of the page, and
      // moving it vertically would be nonsense.
      if (shift) { shift = 0; bar.style.transform = ''; }
      return;
    }
    const box = bar.getBoundingClientRect();
    // getBoundingClientRect is in layout coordinates; `offsetTop` converts the
    // bottom edge into what is actually on screen.
    const gap = Math.round(vv.height - (box.bottom - vv.offsetTop));
    if (!gap) return;
    const next = Math.max(-LIMIT, Math.min(LIMIT, shift + gap));
    if (next === shift) return;
    shift = next;
    bar.style.transform = shift ? `translateY(${shift}px)` : '';
  };

  const tick = () => {
    place();
    if (Date.now() < until) {
      frame = requestAnimationFrame(tick);
    } else {
      frame = 0;
      // One last pass after everything settles: the frame that ends the burst
      // can still be mid-transition.
      place();
    }
  };

  const chase = () => {
    until = Date.now() + QUIET_MS;
    if (!frame) frame = requestAnimationFrame(tick);
  };

  vv.addEventListener('resize', chase);
  vv.addEventListener('scroll', chase);
  window.addEventListener('scroll', chase, { passive: true });
  window.addEventListener('orientationchange', chase);
  if (typeof narrow.addEventListener === 'function') narrow.addEventListener('change', chase);
  chase();

  return () => {
    if (frame) cancelAnimationFrame(frame);
    vv.removeEventListener('resize', chase);
    vv.removeEventListener('scroll', chase);
    window.removeEventListener('scroll', chase);
    window.removeEventListener('orientationchange', chase);
    const bar = document.querySelector(selector);
    if (bar) bar.style.transform = '';
  };
}
