// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UpdatePrompt } from "../../app/src/components/pwa/update-prompt";

describe("install and update", () => {
  it("does not render an update action without a waiting worker", () => expect(renderToStaticMarkup(<UpdatePrompt registration={null} onActivate={() => undefined} />)).toBe(""));

  it("defers activation while a sensitive action is busy", () => {
    const registration = { waiting: {} } as ServiceWorkerRegistration;
    const activate = vi.fn();
    const markup = renderToStaticMarkup(<UpdatePrompt registration={registration} busy onActivate={activate} />);
    expect(markup).toContain("Update waits until this sensitive action finishes.");
    expect(markup).toContain("disabled");
    expect(activate).not.toHaveBeenCalled();
  });
});
