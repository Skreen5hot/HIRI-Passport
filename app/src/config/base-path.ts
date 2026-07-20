export function normalizeBasePath(value: string): string {
  if (/^[a-z][a-z\d+.-]*:/iu.test(value) || value.includes("?") || value.includes("#") || value.includes("\\")) {
    throw new TypeError("base path must be a local absolute path");
  }
  const withLeading = value.startsWith("/") ? value : `/${value}`;
  const collapsed = withLeading.replace(/\/{2,}/gu, "/");
  return collapsed === "/" ? "/" : `${collapsed.replace(/\/$/u, "")}/`;
}

export const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL || "/");

export function assetUrl(path: string): string {
  if (path.startsWith("/") || path.includes("..")) throw new TypeError("asset path must be relative");
  return `${APP_BASE_PATH}${path}`;
}

export function isSyntheticProjectOrigin(location: Pick<Location, "hostname" | "pathname"> = window.location): boolean {
  return location.hostname.toLowerCase().endsWith(".github.io") && location.pathname.startsWith(APP_BASE_PATH);
}
