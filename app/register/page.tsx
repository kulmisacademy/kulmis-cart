import { redirect } from "next/navigation";

/** Legacy vendor signup URL → unified auth. */
export default function RegisterRedirectPage() {
  redirect("/auth?tab=store&mode=register");
}
