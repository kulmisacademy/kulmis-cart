import type { Product } from "./data";

export function createWhatsAppOrderLink(product: Product, phone: string) {
  const message = `Asc, waxaan rabaa inaan dalbado: ${product.title}\nQiimaha: $${product.price}\nLink: https://somcart.so/products/${product.id}`;
  return `https://wa.me/${phone.replace(/\+/g, "")}?text=${encodeURIComponent(message)}`;
}
