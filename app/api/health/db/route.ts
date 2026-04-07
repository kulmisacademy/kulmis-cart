import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";

/** Smoke test for Neon connectivity. Remove or protect if you do not want a public probe. */
export async function GET() {
  try {
    const sql = getSql();
    await sql`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
