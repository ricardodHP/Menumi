import { describe, expect, it } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formats totals as Mexican pesos", () => {
    expect(formatCurrency(360)).toBe("$360.00 MXN");
  });
});
