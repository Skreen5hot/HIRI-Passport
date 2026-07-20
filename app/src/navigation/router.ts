export type Route = { path: string; query: URLSearchParams };

export function parseHash(hash: string): Route {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [pathPart = "/", query = ""] = raw.split("?", 2);
  const path = `/${pathPart.replace(/^\/+|\/+$/gu, "")}`;
  return { path: path === "//" ? "/" : path, query: new URLSearchParams(query) };
}

export function hashHref(path: string): string {
  if (!path.startsWith("/") || path.includes("#")) throw new TypeError("route must be an absolute application path");
  return `#${path}`;
}

export function navigate(path: string): void {
  window.location.hash = hashHref(path);
}
