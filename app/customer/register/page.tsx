import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ next?: string }> };

/** Legacy URL → unified auth (customer register). */
export default async function CustomerRegisterRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  q.set("tab", "customer");
  q.set("mode", "register");
  if (sp.next?.trim() && sp.next.startsWith("/") && !sp.next.startsWith("//")) {
    q.set("next", sp.next.trim());
  }
  redirect(`/auth?${q.toString()}`);
}
