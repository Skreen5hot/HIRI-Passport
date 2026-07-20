/// <reference lib="webworker" />
import { isNetworkOnlyRequest, mayCacheResponse } from "./cache-policy";
declare const __HIRI_PRECACHE__: string[];
declare const __HIRI_CACHE_NAME__: string;
const worker = self as unknown as ServiceWorkerGlobalScope;
const scope = new URL(worker.registration.scope);
const scoped = (path: string) => new URL(path.replace(/^\/+/, ""), scope).href;

worker.addEventListener("install", event => { event.waitUntil(caches.open(__HIRI_CACHE_NAME__).then(cache => cache.addAll(__HIRI_PRECACHE__.map(scoped)))); });
worker.addEventListener("activate", event => { event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name.startsWith("hiri-passport-shell:") && name !== __HIRI_CACHE_NAME__).map(name => caches.delete(name)))).then(() => worker.clients.claim())); });
worker.addEventListener("message", event => { if (event.data === "HIRI_SKIP_WAITING") void worker.skipWaiting(); });
worker.addEventListener("fetch", event => {
  const request = event.request;
  if (new URL(request.url).origin !== scope.origin || isNetworkOnlyRequest(request)) return;
  if (request.mode === "navigate") { event.respondWith(fetch(request).catch(async () => (await caches.match(scoped("index.html"))) ?? Response.error())); return; }
  event.respondWith(caches.match(request).then(async cached => {
    if (cached) return cached;
    const response = await fetch(request);
    if (mayCacheResponse(request, response)) await (await caches.open(__HIRI_CACHE_NAME__)).put(request, response.clone());
    return response;
  }));
});
