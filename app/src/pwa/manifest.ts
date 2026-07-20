import { assetUrl } from "../config/base-path";
export const manifestUrl = () => assetUrl("manifest.webmanifest");
export function applyManifestBase() { const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]'); if (link) link.href = manifestUrl(); }
