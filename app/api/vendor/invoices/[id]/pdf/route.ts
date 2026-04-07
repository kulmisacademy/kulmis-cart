import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { findApprovedVendorById } from "@/lib/approved-vendors";
import { getVendorInvoiceById } from "@/lib/customer/db";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { getVendorSessionCookieName, verifyVendorSession } from "@/lib/vendor-session";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const session = verifyVendorSession(cookieStore.get(getVendorSessionCookieName())?.value);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vendor = await findApprovedVendorById(session.vid);
  if (!vendor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoice = await getVendorInvoiceById(vendor.storeSlug, id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const payload = JSON.parse(invoice.payloadJson) as {
    invoiceId: string;
    storeName: string;
    customerName: string;
    phone: string;
    products: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    date: string;
  };
  const pdf = await renderInvoicePdf({
    invoiceNo: payload.invoiceId,
    storeName: payload.storeName,
    customerName: payload.customerName,
    customerPhone: payload.phone,
    products: payload.products,
    total: payload.total,
    date: payload.date,
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${payload.invoiceId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
