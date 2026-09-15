import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DemoVerifierRoute } from "../../app/src/demo/demo-verifier";

describe("synthetic demo verification", () => {
  it("shows separate results without claiming production verification", () => {
    render(<DemoVerifierRoute />);

    fireEvent.click(screen.getByRole("button", { name: "Inspect synthetic presentation" }));

    expect(screen.getByRole("heading", { name: "Synthetic presentation results" })).toBeVisible();
    expect(screen.getByText("Cryptography", { exact: true })).toBeVisible();
    expect(screen.getByText("Current status", { exact: true })).toBeVisible();
    expect(screen.getByText("Issuer identity", { exact: true })).toBeVisible();
    expect(screen.getByText("Holder binding", { exact: true })).toBeVisible();
    expect(screen.getByText("Relying-party policy", { exact: true })).toBeVisible();
    expect(screen.getByText("not-evaluated", { exact: true })).toBeVisible();
    expect(screen.getByText(/no live signature was checked/i)).toBeVisible();
  });
});
