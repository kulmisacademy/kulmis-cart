import { DashboardShell, type DashboardShellNavItem } from "@/components/dashboard-shell";

type Props = {
  children: React.ReactNode;
  navItems: DashboardShellNavItem[];
  sidebarBrand: React.ReactNode;
  mobileBrand?: React.ReactNode;
  headerActions?: React.ReactNode;
  menuLabel: string;
  onLogout: () => void | Promise<void>;
  logoutLabel: string;
  profileLabel?: string;
  profileLinks?: { href: string; label: string }[];
};

/** Thin wrapper around `DashboardShell` for shared dashboard chrome. */
export function DashboardLayout(props: Props) {
  return <DashboardShell {...props} />;
}
