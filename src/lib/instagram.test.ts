import { describe, expect, it } from "vitest";
import {
  buildInstagramUrl,
  getInstagramDisplayUsername,
  normalizeInstagramUsername,
} from "./instagram";

describe("Instagram input normalization", () => {
  it.each([
    ["pastabella", "pastabella"],
    ["@pastabella", "pastabella"],
    ["https://instagram.com/pastabella", "pastabella"],
    ["https://www.instagram.com/pastabella/", "pastabella"],
  ])("normalizes %s to the username %s", (input, username) => {
    expect(normalizeInstagramUsername(input)).toBe(username);
  });

  it("builds one public URL and display username from legacy URL values", () => {
    const storedValue = "https://instagram.com/pastabella";

    expect(getInstagramDisplayUsername(storedValue)).toBe("@pastabella");
    expect(buildInstagramUrl(storedValue)).toBe("https://www.instagram.com/pastabella/");
  });

  it.each([
    "https://notinstagram.com/pastabella",
    "https://instagram.com/pastabella/p/123",
    "invalid username",
    "@",
  ])("rejects invalid Instagram input %s", (input) => {
    expect(normalizeInstagramUsername(input)).toBeNull();
    expect(buildInstagramUrl(input)).toBeNull();
  });
});
