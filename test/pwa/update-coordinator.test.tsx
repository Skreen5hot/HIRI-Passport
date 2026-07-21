import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { registerMock } = vi.hoisted(() => ({ registerMock: vi.fn() }));
vi.mock("../../app/src/pwa/register", () => ({ registerPassportServiceWorker: registerMock }));

import { PwaUpdateCoordinator } from "../../app/src/components/pwa/update-coordinator";

type RegistrationNotifier = (state: "unsupported" | "registered" | "update-ready" | "failed", registration?: ServiceWorkerRegistration) => void;
const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

afterEach(() => {
  registerMock.mockReset();
  if (originalServiceWorker) Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
  else Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("PWA update coordinator", () => {
  it("requests activation and reloads only after the new worker controls the tab", async () => {
    const serviceWorkers = new EventTarget() as ServiceWorkerContainer;
    Object.defineProperty(serviceWorkers, "controller", { configurable: true, value: {} });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorkers });

    const postMessage = vi.fn();
    const registration = { waiting: { postMessage }, update: vi.fn().mockResolvedValue(undefined) } as unknown as ServiceWorkerRegistration;
    registerMock.mockImplementation(async (notify: RegistrationNotifier) => notify("update-ready", registration));
    const reload = vi.fn();

    render(<PwaUpdateCoordinator reload={reload} />);
    window.dispatchEvent(new Event("load"));

    const action = await screen.findByRole("button", { name: "Reload to update" });
    fireEvent.click(action);
    expect(postMessage).toHaveBeenCalledWith("HIRI_SKIP_WAITING");
    expect(reload).not.toHaveBeenCalled();

    serviceWorkers.dispatchEvent(new Event("controllerchange"));
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
  });
});
