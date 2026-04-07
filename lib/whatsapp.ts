import type { Product } from "./data";
import { orderUrl, productUrl } from "./site";

export type WhatsAppOrderCustomerContext = {
  fullName: string;
  phone: string;
  region: string;
  district: string;
};

export function createWhatsAppOrderLink(
  product: Product,
  phone: string,
  customer?: WhatsAppOrderCustomerContext,
) {
  const link = productUrl(product.id);
  let message = `Asc, waxaan rabaa inaan dalbado: ${product.title}\nQiimaha: $${product.price}\nLink: ${link}`;
  if (customer) {
    message += `\n\nMacmiilka: ${customer.fullName}\nTel: ${customer.phone}\nGoobta: ${customer.region}, ${customer.district}`;
  }
  return `https://wa.me/${phone.replace(/\+/g, "")}?text=${encodeURIComponent(message)}`;
}

export function createWhatsAppShareProductLink(product: Product, phone: string) {
  return createWhatsAppOrderLink(product, phone);
}

/** Quick hello to a store (e.g. from store card). */
export function createWhatsAppStoreHelloLink(phone: string, storeName: string) {
  const message = `Asc, waxaan ka helay KULMISCART — ${storeName}. Ma heli karaa macluumaad dheeraad ah?`;
  return `https://wa.me/${phone.replace(/\+/g, "")}?text=${encodeURIComponent(message)}`;
}

export type CheckoutLineForMessage = {
  title: string;
  quantity: number;
  unitPrice: number;
};

/**
 * After a saved checkout — message to the seller (one store per link).
 */
export function createCheckoutWhatsAppLink(
  sellerPhone: string,
  storeName: string,
  lines: CheckoutLineForMessage[],
  ctx: WhatsAppOrderCustomerContext,
  checkoutId: string,
) {
  const digits = sellerPhone.replace(/\D/g, "");
  const list = lines.map((l) => `- ${l.title} (x${l.quantity})`).join("\n");
  const message = `Hello 👋

Store: ${storeName}

I want to order:

${list}

My Location:
${ctx.region} / ${ctx.district}

My Phone:
${ctx.phone}

Order link:
${orderUrl(checkoutId)}`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
