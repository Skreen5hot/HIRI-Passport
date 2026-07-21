import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/app-shell";
import { PwaUpdateCoordinator } from "./components/pwa/update-coordinator";
import { isSyntheticDemoBuild } from "./demo/demo-gate";
import { parseHash } from "./navigation/router";
import { ROUTES } from "./navigation/routes";

function currentHash() { return window.location.hash || "#/"; }

export function DemoApp() {
  const [hash, setHash] = useState(currentHash);
  useEffect(() => { const listener = () => setHash(currentHash()); window.addEventListener("hashchange", listener); return () => window.removeEventListener("hashchange", listener); }, []);
  const route = useMemo(() => parseHash(hash), [hash]);
  const selected = ROUTES[route.path] ?? { title: "Not found", content: <section className="panel"><p className="eyebrow">404</p><h1>That route is not part of this Passport.</h1><a className="button" href="#/home">Return home</a></section> };
  useEffect(() => { document.title = `${selected.title} · HIRI Passport`; requestAnimationFrame(() => document.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true })); }, [selected.title]);
  return <><AppShell demo={isSyntheticDemoBuild()}>{selected.content}</AppShell><PwaUpdateCoordinator /></>;
}
