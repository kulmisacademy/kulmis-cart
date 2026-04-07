import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "admins.json");

export type AdminRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

async function readAll(): Promise<AdminRecord[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function findAdminByEmail(email: string): Promise<AdminRecord | undefined> {
  const e = email.trim().toLowerCase();
  const all = await readAll();
  return all.find((r) => r.email.toLowerCase() === e);
}

export async function findAdminById(id: string): Promise<AdminRecord | undefined> {
  const all = await readAll();
  return all.find((r) => r.id === id);
}
