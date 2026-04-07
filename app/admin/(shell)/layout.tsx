import { AdminShell } from "@/components/admin-shell";
import { requireAdminSession } from "@/lib/admin-auth-server";

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  return <AdminShell email={session.email}>{children}</AdminShell>;
}
