import { promises as fs } from "fs";
import path from "path";
import { listApprovedVendors } from "@/lib/approved-vendors";
import { countCustomerOrderLines } from "@/lib/customer/db";
import { getPendingVendors } from "@/lib/pending-vendors";

const DASH_DIR = path.join(process.cwd(), "data", "vendor-dashboard");

async function readApprovedCount(): Promise<number> {
  const list = await listApprovedVendors();
  return list.length;
}

async function sumOrdersFromDashboardFiles(): Promise<number> {
  try {
    const names = await fs.readdir(DASH_DIR);
    let total = 0;
    for (const f of names) {
      if (!f.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(DASH_DIR, f), "utf-8");
        const data = JSON.parse(raw) as { orders?: unknown[] };
        if (Array.isArray(data.orders)) total += data.orders.length;
      } catch {
        /* skip */
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Customer checkouts are stored in Neon (`sc_customer_orders`). Legacy vendor JSON
 * may also list orders — prefer DB when configured so the dashboard matches Admin → Orders.
 */
async function resolveTotalOrders(): Promise<number> {
  if (!process.env.DATABASE_URL?.trim()) {
    return sumOrdersFromDashboardFiles();
  }
  try {
    return await countCustomerOrderLines();
  } catch (e) {
    console.error("admin-stats: DB order count failed, falling back to dashboard files", e);
    return sumOrdersFromDashboardFiles();
  }
}

export async function getAdminDashboardStats() {
  const [totalVendors, pendingList, totalOrders] = await Promise.all([
    readApprovedCount(),
    getPendingVendors(),
    resolveTotalOrders(),
  ]);

  return {
    totalVendors,
    pendingApprovals: pendingList.length,
    totalOrders,
  };
}
