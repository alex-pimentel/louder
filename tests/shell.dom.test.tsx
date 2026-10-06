// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Shell } from "../src/shell/shell";

describe("Shell", () => {
  it("renders the shared Agenteresolve header and footer without a Clerk key", async () => {
    render(
      <Shell>
        <p>Conteúdo do leitor</p>
      </Shell>,
    );

    const header = (await screen.findByRole("banner", undefined, {
      timeout: 5_000,
    })) as HTMLElement;
    expect(header).toBeTruthy();
    expect(header.textContent).toContain("Agenteresolve");
    expect(screen.getByText("Conteúdo do leitor")).toBeTruthy();
    expect(screen.getByText(/Todos os direitos reservados/)).toBeTruthy();
    expect(screen.getByText("Serviços")).toBeTruthy();

    // Login is optional: without VITE_CLERK_PUBLISHABLE_KEY the fallback renders.
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
  });

  it("keeps the reader content when the shell cannot load", async () => {
    render(
      <Shell>
        <p data-testid="fallback">Conteúdo do leitor</p>
      </Shell>,
    );

    expect(await screen.findByTestId("fallback", undefined, { timeout: 5_000 })).toBeTruthy();
  });
});
