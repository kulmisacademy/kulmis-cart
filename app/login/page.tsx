import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ next?: string }> };

/** Legacy URL → unified auth (store / vendor tab). */
export default async function LoginRedirectPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  q.set("tab", "store");
  if (sp.next?.trim() && sp.next.startsWith("/") && !sp.next.startsWith("//")) {
    q.set("next", sp.next.trim());
  }
  redirect(`/auth?${q.toString()}`);
}
