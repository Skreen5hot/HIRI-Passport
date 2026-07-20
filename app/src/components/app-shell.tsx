import type { ReactNode } from "react";
import { hashHref } from "../navigation/router";

const navigation = [
  ["/home", "Passport"], ["/acquire", "Add"], ["/request", "Present"], ["/verify", "Verify"], ["/settings", "Settings"]
] as const;

export function AppShell({ children, demo }: { children: ReactNode; demo: boolean }) {
  return <div className="site-frame">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {demo && <div className="demo-ribbon" role="status">Synthetic demo · no real keys or credentials</div>}
    <header className="topbar">
      <a className="brand" href={hashHref("/")} aria-label="HIRI Passport home">
        <span className="brand-mark" aria-hidden="true">H</span>
        <span><b>HIRI</b><small>Passport</small></span>
      </a>
      <nav aria-label="Primary navigation">
        {navigation.map(([path, label]) => <a key={path} href={hashHref(path)}>{label}</a>)}
      </nav>
    </header>
    <main id="main-content" tabIndex={-1}>{children}</main>
    <footer><span>Local-first identity tools</span><span>Working Draft · no conformance claim</span></footer>
  </div>;
}
