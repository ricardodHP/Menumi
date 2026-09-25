import { describe, expect, it } from "vitest";
import { MENU_THEMES, getMenuThemeStyles, normalizeMenuTheme } from "./menu-theme";

describe("normalizeMenuTheme", () => {
  it("accepts claro y oscuro and defaults legacy values to light", () => {
    expect(normalizeMenuTheme("light")).toBe("light");
    expect(normalizeMenuTheme("dark")).toBe("dark");
    expect(normalizeMenuTheme(undefined)).toBe("light");
    expect(normalizeMenuTheme("unknown")).toBe("light");
  });

  it("exposes the two owner-facing choices", () => {
    expect(MENU_THEMES.map((theme) => theme.value)).toEqual(["light", "dark"]);
  });
});

describe("getMenuThemeStyles", () => {
  it("keeps light as the existing theme and provides readable dark semantic colors", () => {
    expect(getMenuThemeStyles("light")).toEqual({});
    expect(getMenuThemeStyles("dark")).toMatchObject({
      "--background": "222 30% 10%",
      "--foreground": "210 25% 96%",
      "--card": "222 24% 14%",
      "--muted-foreground": "215 16% 72%",
      "--border": "222 16% 28%",
    });
  });
});
