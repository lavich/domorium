// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("App", () => {
  it("renders the Domorium application shell", () => {
    render(<App />);
    expect(screen.getByRole("main")).not.toBeNull();
  });
});
