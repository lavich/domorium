import type { MediaCrop } from "../../types";

/**
 * The rectangle to draw, clamped to the loaded image, or null for "show the
 * whole image" — which is what a rectangle the image does not reach comes to.
 */
export function drawnCrop(
  crop: MediaCrop,
  naturalWidth: number,
  naturalHeight: number,
): MediaCrop | null {
  if (!(naturalWidth > 0 && naturalHeight > 0)) {
    return null;
  }
  const left = Math.max(0, crop.left);
  const top = Math.max(0, crop.top);
  const width = Math.min(crop.left + crop.width, naturalWidth) - left;
  const height = Math.min(crop.top + crop.height, naturalHeight) - top;
  if (!(width > 0 && height > 0)) {
    return null;
  }
  return { top, left, width, height };
}
