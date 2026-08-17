/*
 * Gaps in jsdom that a component library steps into.
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
