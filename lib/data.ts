/**
 * Shared marketplace types. Live catalog comes from approved vendors + vendor dashboard data
 * — see `lib/marketplace-catalog.ts`.
 */
export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  images?: string[];
  videoUrl?: string;
  createdAt: string;
  /** Approved vendor id — used in canonical /store/{name}-{id} links. */
  vendorId: string;
  storeSlug: string;
  storeName: string;
  category: string;
  region: string;
  /** Store district (for location display). */
  district?: string;
  /** Bullet-style features (optional; vendor manual or AI) */
  features?: string;
  /** Stock badge on product cards (defaults derived from id when omitted). */
  stockStatus?: "in-stock" | "limited";
  /** Platform verified badge for the seller store (from admin verification). */
  storeVerified?: boolean;
};

export type Store = {
  /** Internal unique slug (DB / chat / APIs). */
  slug: string;
  /** Approved vendor id — canonical storefront URL. */
  vendorId: string;
  name: string;
  /** Initials fallback when `logoUrl` is not set */
  logo: string;
  /** Optional square logo image (shown in circle when set) */
  logoUrl?: string;
  phone: string;
  region: string;
  district: string;
  description: string;
  bannerImage?: string;
  /** Average rating 1–5 (live feedback may override in UI) */
  rating: number;
  totalReviews: number;
  /** Admin / system verified badge */
  isVerified: boolean;
  /** Promotional chips on the card */
  badges?: ("top-rated" | "best-seller")[];
};

export type Testimonial = {
  name: string;
  quote: string;
  /** Shown under the name, e.g. role or city */
  role?: string;
};

/** No baked-in quotes — add CMS or DB later if needed. */
export const testimonials: Testimonial[] = [];
