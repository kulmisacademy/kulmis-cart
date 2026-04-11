import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const DEFAULT_SEGMENT = "secure-admin-portal-9x7a";

/** Top-level routes — never treat as admin entry (avoid collisions with `ADMIN_LOGIN_PATH`). */
const RESERVED_TOP_LEVEL = new Set([
  "api",
  "_next",
  "products",
  "stores",
  "store",
  "cart",
  "checkout",
  "auth",
  "login",
  "register",
  "account",
  "admin",
  "vendor",
  "customer",
  "chat",
  "orders",
]);

function adminLoginSegment(): string {
  const raw = process.env.ADMIN_LOGIN_PATH ?? process.env.NEXT_PUBLIC_ADMIN_LOGIN_PATH ?? DEFAULT_SEGMENT;
  return raw.replace(/^\/+|\/+$/g, "") || DEFAULT_SEGMENT;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = adminLoginSegment();

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length !== 1) {
    return NextResponse.next();
  }
  if (RESERVED_TOP_LEVEL.has(parts[0]!)) {
    return NextResponse.next();
  }
  if (parts[0] === secret) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

/** Single-segment paths (for optional secret admin URL rewrite); static files excluded. */
export const config = {
  matcher: ["/((?!api|_next|_next/static|_next/image|_vercel|favicon.ico|.*\\..*).*)"],
};
