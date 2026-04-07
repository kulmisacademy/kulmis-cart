import { notFound } from "next/navigation";
import { ChatPageClient } from "@/app/chat/[storeSlug]/chat-page-client";
import { getProductById, getStoreBySlug } from "@/lib/marketplace-catalog";

type Props = {
  params: Promise<{ storeSlug: string }>;
  searchParams: Promise<{ productId?: string; threadId?: string }>;
};

export default async function ChatStorePage({ params, searchParams }: Props) {
  const { storeSlug } = await params;
  const { productId, threadId } = await searchParams;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const product = productId ? await getProductById(productId) : undefined;
  const initialProduct =
    product && product.storeSlug === storeSlug
      ? {
          productId: product.id,
          name: product.title,
          price: product.price,
          image: product.image,
          link: `/products/${product.id}`,
        }
      : undefined;

  return (
    <ChatPageClient
      storeSlug={storeSlug}
      storeName={store.name}
      initialProduct={initialProduct}
      threadId={threadId}
    />
  );
}
