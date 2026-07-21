import { useCallback, useEffect, useRef, useState } from "react";
import { registerPassportServiceWorker } from "../../pwa/register";
import { UpdatePrompt } from "./update-prompt";

const LIFECYCLE_CHANNEL = "hiri-passport-pwa-lifecycle-v1";
type LifecycleMessage = { type: "update-ready" | "activation-requested" };

function isLifecycleMessage(value: unknown): value is LifecycleMessage {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return type === "update-ready" || type === "activation-requested";
}

const reloadWindow = () => window.location.reload();

export function PwaUpdateCoordinator({ busy = false, reload = reloadWindow }: { busy?: boolean; reload?: () => void }) {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [activating, setActivating] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const busyRef = useRef(busy);
  const activationRequested = useRef(false);
  const reloadPending = useRef(false);
  const reloadStarted = useRef(false);

  const reloadWhenSafe = useCallback(() => {
    if (!reloadPending.current || busyRef.current || reloadStarted.current) return;
    reloadStarted.current = true;
    reload();
  }, [reload]);

  useEffect(() => {
    busyRef.current = busy;
    reloadWhenSafe();
  }, [busy, reloadWhenSafe]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let active = true;
    let hadController = Boolean(navigator.serviceWorker.controller);

    const exposeWaitingWorker = (candidate: ServiceWorkerRegistration) => {
      registrationRef.current = candidate;
      if (candidate.waiting) setRegistration(candidate);
    };

    const onControllerChange = () => {
      if (!hadController && !activationRequested.current) {
        hadController = true;
        return;
      }
      reloadPending.current = true;
      reloadWhenSafe();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(LIFECYCLE_CHANNEL);
      channelRef.current = channel;
      channel.addEventListener("message", event => {
        if (!active || !isLifecycleMessage(event.data)) return;
        if (event.data.type === "activation-requested") {
          activationRequested.current = true;
          setActivating(true);
          return;
        }
        const candidate = registrationRef.current;
        if (!candidate) return;
        if (candidate.waiting) exposeWaitingWorker(candidate);
        else void candidate.update().then(() => { if (active && candidate.waiting) exposeWaitingWorker(candidate); }).catch(() => undefined);
      });
    }

    const register = () => {
      void registerPassportServiceWorker((state, candidate) => {
        if (!active || !candidate) return;
        registrationRef.current = candidate;
        if (state !== "update-ready") return;
        exposeWaitingWorker(candidate);
        channelRef.current?.postMessage({ type: "update-ready" } satisfies LifecycleMessage);
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => {
      active = false;
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [reloadWhenSafe]);

  const activate = () => {
    const waiting = registration?.waiting;
    if (!waiting) return;
    activationRequested.current = true;
    setActivating(true);
    channelRef.current?.postMessage({ type: "activation-requested" } satisfies LifecycleMessage);
    waiting.postMessage("HIRI_SKIP_WAITING");
  };

  return <UpdatePrompt registration={registration} busy={busy} activating={activating} onActivate={activate} />;
}
