/** Yield a paint opportunity before starting more diff work. */
export function afterPaint(work: () => void): () => void {
  let frame = 0;
  let timer = 0;
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      timer = window.setTimeout(work, 0);
    });
  });
  return () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
  };
}
