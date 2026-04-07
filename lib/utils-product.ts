import type { Product } from "./data";

const MAX_GALLERY = 4;

export function getPrimaryImage(product: Product): string {
  return product.images?.[0] ?? product.image;
}

/** Up to 4 images for gallery (PRD: max 4). */
export function getGalleryImages(product: Product): string[] {
  if (product.images?.length) {
    return product.images.slice(0, MAX_GALLERY);
  }
  return [product.image];
}
