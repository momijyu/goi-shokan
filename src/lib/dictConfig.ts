/**
 * Base URL for dictionary assets (/dict locally, or an external CDN/R2 bucket such as https://pub-xxxx.r2.dev).
 */
export function getDictBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_DICT_BASE_URL?.trim();
  if (!raw) return "/dict";
  return raw.replace(/\/+$/, "");
}

export function getDictFileUrl(filename: string): string {
  const cleanName = filename.replace(/^\/+/, "");
  return `${getDictBaseUrl()}/${cleanName}`;
}
