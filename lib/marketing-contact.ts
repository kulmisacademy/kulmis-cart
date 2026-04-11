/** Marketplace support / marketing contact (footer, floating WhatsApp). Override via env on Vercel. */
const DEFAULT_WHATSAPP_DIGITS = "252613609678";
const DEFAULT_EMAIL = "info@laas24.com";

export function getSupportWhatsAppDigits(): string {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.trim() ?? DEFAULT_WHATSAPP_DIGITS;
  return raw.replace(/\D/g, "") || DEFAULT_WHATSAPP_DIGITS;
}

export function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || DEFAULT_EMAIL;
}

export function supportWhatsAppHref(): string {
  return `https://wa.me/${getSupportWhatsAppDigits()}`;
}

export function supportMailtoHref(): string {
  return `mailto:${getSupportEmail()}`;
}
