import { describe, expect, it } from "vitest";
import { buildMenuPreviewPath, isCuisineTemplate, normalizeMenuLayout } from "./menu-layout";

describe("normalizeMenuLayout", () => {
  it.each(["social", "classic", "gallery"] as const)("preserves the supported layout %s", (layout) => {
    expect(normalizeMenuLayout(layout)).toBe(layout);
  });

  it("uses Social for a missing or unsupported value", () => {
    expect(normalizeMenuLayout(undefined)).toBe("social");
    expect(normalizeMenuLayout("surprise")).toBe("social");
  });
});

describe("isCuisineTemplate", () => {
  it.each(["generic", "mexican", "italian", "chinese", "japanese"])("accepts the current theme %s", (theme) => {
    expect(isCuisineTemplate(theme)).toBe(true);
  });

  it("rejects values outside the current theme list", () => {
    expect(isCuisineTemplate("future-theme")).toBe(false);
    expect(isCuisineTemplate(undefined)).toBe(false);
  });
});

describe("buildMenuPreviewPath", () => {
  it("replaces only the preview configuration and preserves other query parameters", () => {
    expect(
      buildMenuPreviewPath(
        "/r/demo?preview=0&menu_layout=social&menu_theme=light&cuisine_template=generic&dish=dish-1",
        "gallery",
        "dark",
        "japanese",
      ),
    ).toBe("/r/demo?preview=1&menu_layout=gallery&menu_theme=dark&cuisine_template=japanese&dish=dish-1");
  });
});
