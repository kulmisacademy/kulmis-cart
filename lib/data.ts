export type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  image: string;
  storeSlug: string;
  storeName: string;
  category: string;
  region: string;
};

export type Store = {
  slug: string;
  name: string;
  logo: string;
  phone: string;
  region: string;
  district: string;
  description: string;
};

export const stores: Store[] = [
  {
    slug: "hodan-fashion",
    name: "Hodan Fashion",
    logo: "HF",
    phone: "+252611111111",
    region: "Banaadir",
    district: "Hodan",
    description: "Modern abayas, dresses, and accessories with fast Mogadishu delivery.",
  },
  {
    slug: "mog-tech-hub",
    name: "Mog Tech Hub",
    logo: "MT",
    phone: "+252622222222",
    region: "Banaadir",
    district: "Wadajir",
    description: "Smartphones, accessories, and verified electronics with trusted support.",
  },
  {
    slug: "som-fresh-market",
    name: "Som Fresh Market",
    logo: "SF",
    phone: "+252633333333",
    region: "Hargeisa",
    district: "Ibrahim Koodbuur",
    description: "Daily fresh groceries and household staples for families and restaurants.",
  },
];

export const products: Product[] = [
  {
    id: "p1",
    title: "Premium Black Abaya",
    description: "Elegant lightweight abaya for daily and event wear.",
    price: 39,
    oldPrice: 49,
    image: "https://images.unsplash.com/photo-1583391733981-8498433f1883?auto=format&fit=crop&w=800&q=80",
    storeSlug: "hodan-fashion",
    storeName: "Hodan Fashion",
    category: "Fashion",
    region: "Banaadir",
  },
  {
    id: "p2",
    title: "Wireless Earbuds Pro",
    description: "Clear sound, long battery life, and noise reduction.",
    price: 55,
    image: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=800&q=80",
    storeSlug: "mog-tech-hub",
    storeName: "Mog Tech Hub",
    category: "Electronics",
    region: "Banaadir",
  },
  {
    id: "p3",
    title: "Organic Dates Pack",
    description: "Fresh and naturally sweet premium dates.",
    price: 12,
    image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80",
    storeSlug: "som-fresh-market",
    storeName: "Som Fresh Market",
    category: "Groceries",
    region: "Hargeisa",
  },
  {
    id: "p4",
    title: "Samsung Galaxy A Series",
    description: "High-value smartphone with reliable camera performance.",
    price: 220,
    oldPrice: 249,
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=800&q=80",
    storeSlug: "mog-tech-hub",
    storeName: "Mog Tech Hub",
    category: "Electronics",
    region: "Banaadir",
  },
  {
    id: "p5",
    title: "Imported Perfume Set",
    description: "Long-lasting scents in a premium gift-ready box.",
    price: 34,
    image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
    storeSlug: "hodan-fashion",
    storeName: "Hodan Fashion",
    category: "Beauty",
    region: "Banaadir",
  },
  {
    id: "p6",
    title: "Rice 10kg Family Bag",
    description: "Clean, premium rice ideal for daily home cooking.",
    price: 18,
    image: "https://images.unsplash.com/photo-1586201375761-83865001e8ac?auto=format&fit=crop&w=800&q=80",
    storeSlug: "som-fresh-market",
    storeName: "Som Fresh Market",
    category: "Groceries",
    region: "Hargeisa",
  },
];

export const testimonials = [
  {
    name: "Ayaan M.",
    quote: "I launched my shop in one day and got my first WhatsApp order the same evening.",
  },
  {
    name: "Abdi K.",
    quote: "Browsing products is easy and contacting sellers directly is much faster.",
  },
];

export const plans = [
  {
    name: "Free",
    price: "$0",
    features: ["Limited products", "Basic store profile", "No AI assistant"],
  },
  {
    name: "Pro",
    price: "$19/mo",
    features: ["Unlimited products", "AI product analysis", "Priority support"],
  },
];
