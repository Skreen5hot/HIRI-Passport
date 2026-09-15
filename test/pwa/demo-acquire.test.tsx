import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoAcquireRoute } from "../../app/src/demo/demo-acquire";
import { DEMO_CREDENTIALS } from "../../app/src/demo/demo-fixtures";
import { AppStateProvider } from "../../app/src/state/app-state";

const initialSnapshot = Object.freeze({
  credentials: Object.freeze([...DEMO_CREDENTIALS]),
  history: Object.freeze([]),
  authority: null,
  authorityReady: false,
  backupVerified: false
});

describe("synthetic demo acquisition", () => {
  it("adds only the fixed in-memory sample and never exposes production import controls", async () => {
    render(<AppStateProvider mode="synthetic-demo" lifecycle="ready" initialSnapshot={initialSnapshot}>
      <DemoAcquireRoute />
    </AppStateProvider>);

    expect(screen.queryByText(/production runtime composes/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add synthetic sample credential" }));

    expect(await screen.findByRole("status")).toHaveTextContent("4 local records");
    expect(screen.getByRole("button", { name: "Synthetic sample added" })).toBeDisabled();
  });
});
