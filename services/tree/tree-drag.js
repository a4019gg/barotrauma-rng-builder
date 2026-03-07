export function rafBatch(renderFn) {
  let frame = null;
  let lastArgs = null;
  return (...args) => {
    lastArgs = args;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      renderFn(...(lastArgs || []));
    });
  };
}
