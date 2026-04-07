import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { findApprovedVendorByEmail } from "@/lib/approved-vendors";
import { findCustomerByEmail } from "@/lib/customer/db";
import { notifyAdminsNewVendorRegistered } from "@/lib/notifications/service";
import { registerVendorInstant } from "@/lib/vendor-approval";
import { vendorRegistrationSchema } from "@/lib/vendor-registration-schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid form data" }, { status: 400 });
  }

  const logoEntry = formData.get("logo");
  const logo =
    logoEntry && typeof logoEntry !== "string" && "arrayBuffer" in logoEntry ? (logoEntry as File) : undefined;

  const bannerEntry = formData.get("banner");
  const banner =
    bannerEntry && typeof bannerEntry !== "string" && "arrayBuffer" in bannerEntry ? (bannerEntry as File) : undefined;

  const raw = {
    storeName: String(formData.get("storeName") ?? ""),
    primaryPhone: String(formData.get("primaryPhone") ?? ""),
    region: String(formData.get("region") ?? ""),
    district: String(formData.get("district") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
    logo,
    banner,
  };

  const parsed = vendorRegistrationSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const msg =
      Object.values(first).flat()[0] ?? parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json({ ok: false, message: msg, fieldErrors: first }, { status: 422 });
  }

  const data = parsed.data;
  if (!(data.logo instanceof File)) {
    return NextResponse.json({ ok: false, message: "Store logo is required" }, { status: 422 });
  }
  const logoFile = data.logo;
  const emailLower = data.email.trim().toLowerCase();

  if (await findApprovedVendorByEmail(emailLower)) {
    return NextResponse.json(
      { ok: false, message: "This email is already registered", fieldErrors: { email: ["Email must be unique"] } },
      { status: 409 },
    );
  }

  if (await findCustomerByEmail(emailLower)) {
    return NextResponse.json(
      {
        ok: false,
        message: "This email is already used for a customer account. Use a different email for your store.",
        fieldErrors: { email: ["Email already used as customer"] },
      },
      { status: 409 },
    );
  }

  const passwordHash = await hash(data.password, 10);
  const buf = Buffer.from(await logoFile.arrayBuffer());
  const logoDataBase64 = buf.toString("base64");
  const logoMime = logoFile.type || "image/png";

  let bannerPayload: { bannerMime: string; bannerDataBase64: string } | undefined;
  if (data.banner instanceof File && data.banner.size > 0) {
    const bbuf = Buffer.from(await data.banner.arrayBuffer());
    bannerPayload = {
      bannerMime: data.banner.type || "image/png",
      bannerDataBase64: bbuf.toString("base64"),
    };
  }

  const result = await registerVendorInstant({
    storeName: data.storeName.trim(),
    storePhone: data.primaryPhone,
    whatsAppNumber: data.primaryPhone,
    region: data.region,
    district: data.district.trim(),
    email: emailLower,
    passwordHash,
    logoMime,
    logoDataBase64,
    ...bannerPayload,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.error }, { status: 400 });
  }

  void notifyAdminsNewVendorRegistered(data.storeName.trim());

  return NextResponse.json({
    ok: true,
    role: "vendor" as const,
    message: "Your store is live. Sign in with your email and password to open the vendor dashboard.",
    storeSlug: result.storeSlug,
  });
}
