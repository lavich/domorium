/*
 * Gaps in jsdom that the libraries under test step into.
 *
 * `ScrollArea` asks the viewport for its running animations on a timer, and
 * jsdom implements no Web Animations API — the call lands after a test has
 * finished, so it arrives as an unhandled error rather than a failure.
 */
if (typeof Element !== "undefined" && !("getAnimations" in Element.prototype)) {
  Object.defineProperty(Element.prototype, "getAnimations", {
    value: () => [],
    writable: true,
  });
}

/*
 * CodeMirror measures a position by asking a Range for its rectangles, and jsdom
 * implements neither method on Range. Any test that moves the mouse arms the
 * hover tooltip's timer, so without these the measurement throws 300 ms later —
 * after the test that caused it has finished. Zero rectangles are enough: the
 * measurement answers, and nothing in a test asserts on geometry.
 */
if (typeof Range !== "undefined" && !("getClientRects" in Range.prototype)) {
  const zero = () => ({
    x: 0,
    y: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  });
  Object.defineProperty(Range.prototype, "getClientRects", {
    value: () => [zero()],
    writable: true,
  });
  Object.defineProperty(Range.prototype, "getBoundingClientRect", {
    value: zero,
    writable: true,
  });
}
