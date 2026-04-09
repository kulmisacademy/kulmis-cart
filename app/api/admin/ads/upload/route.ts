import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveMimeForUpload } from "@/lib/ad-image-upload";
import { getAdminSessionCookieName, verifyAdminSession } from "@/lib/admin-session";

export const runtime = "nodejs";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_BYTES = 3 * 1024 * 1024;

function extForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/gif":
      return "gif";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(getAdminSessionCookieName())?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const fileEntry = formData.get("file");
  const file =
    fileEntry && typeof fileEntry !== "string" && "arrayBuffer" in fileEntry ? (fileEntry as File) : null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 3MB)" }, { status: 400 });
  }

  const mime = resolveMimeForUpload(file);
  if (!ALLOWED.has(mime)) {
    return NextResponse.json(
      {
        error:
          "Use JPEG, PNG, GIF, or WebP. If the file is valid, save it as .png/.jpg or paste an https image URL in the ad form.",
      },
      { status: 400 },
    );
  }

  const ext = extForMime(mime);
  if (ext === "bin") {
    return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
  }

  const name = `${randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "ads");
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buf);

  const url = `/uploads/ads/${name}`;
  return NextResponse.json({ url });
}
