const NETWORK_ONLY_SEGMENTS = ["/resolve", "/status", "/submit", "/presentation"];
export function isNetworkOnlyRequest(request: Request) { if (request.method !== "GET") return true; const url = new URL(request.url); return NETWORK_ONLY_SEGMENTS.some(segment => url.pathname.includes(segment)); }
export function mayCacheResponse(request: Request, response: Response) { return request.method === "GET" && response.ok && response.type !== "opaque" && !isNetworkOnlyRequest(request) && ["script", "style", "image", "font", "manifest"].includes(request.destination); }
