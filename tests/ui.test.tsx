// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
import { Checkbox } from "../src/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../src/components/ui/select";
import { Slider } from "../src/components/ui/slider";

describe("ui primitives", () => {
  it("renders a slider with accessible role", () => {
    render(<Slider defaultValue={[50]} max={100} aria-label="Velocidade" />);
    expect(screen.getByRole("slider")).toBeTruthy();
  });

  it("renders a closed select with its trigger", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Voz">
          <SelectValue placeholder="Escolha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByLabelText("Voz")).toBeTruthy();
  });

  it("renders a checkbox with its label", () => {
    render(
      <div>
        <Checkbox id="c" />
        <label htmlFor="c">Limpo</label>
      </div>,
    );
    expect(screen.getByLabelText("Limpo")).toBeTruthy();
  });
});
