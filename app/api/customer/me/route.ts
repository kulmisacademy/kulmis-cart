import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCustomerSessionCookieName, verifyCustomerSession } from "@/lib/customer-session";
import { getCustomerById } from "@/lib/customer/db";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = verifyCustomerSession(cookieStore.get(getCustomerSessionCookieName())?.value);
    if (!session) {
      return NextResponse.json({ customer: null });
    }
    const customer = await getCustomerById(session.cid);
    return NextResponse.json({ customer });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ customer: null, error: "unavailable" }, { status: 503 });
  }
}
