/** When `File.type` is empty (some exports), infer MIME from extension. */
export function inferMimeFromFileName(name: string): string | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

export function resolveMimeForUpload(file: File): string {
  const fromBrowser = file.type?.trim();
  if (fromBrowser) return fromBrowser;
  return inferMimeFromFileName(file.name) ?? "";
}
