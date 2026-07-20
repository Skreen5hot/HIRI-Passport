import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { AppStateProvider } from "./state/app-state";
import "./styles/global.css";
import { applyManifestBase } from "./pwa/manifest";
import { registerPassportServiceWorker } from "./pwa/register";

const root = document.getElementById("root");
if (!root) throw new Error("application root is missing");
applyManifestBase();
createRoot(root).render(<StrictMode><AppStateProvider><App /></AppStateProvider></StrictMode>);
window.addEventListener("load", () => void registerPassportServiceWorker());
