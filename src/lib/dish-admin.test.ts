import { describe, expect, it } from "vitest";
import { filterAdminDishes, getDishImageExtension, isSupportedDishImage, normalizeDishTags, validateDishPrice } from "./dish-admin";

const dishes = [
  { id: "1", name: "Pasta verde", description: "Con albahaca", tags: ["vegano"], category: "pastas" },
  { id: "2", name: "Sopa", description: "Caliente", tags: ["casero"], category: "" },
];

describe("dish admin helpers", () => {
  it("combines name, description, tag, and category filtering", () => {
    expect(filterAdminDishes(dishes, "albahaca", "pastas")).toEqual([dishes[0]]);
    expect(filterAdminDishes(dishes, "casero", "uncategorized")).toEqual([dishes[1]]);
    expect(filterAdminDishes(dishes, "inexistente", "all")).toEqual([]);
  });

  it("requires a positive price while preserving an unchanged legacy value", () => {
    expect(validateDishPrice("  ")).toBeNull();
    expect(validateDishPrice("0")).toBeNull();
    expect(validateDishPrice("-1")).toBeNull();
    expect(validateDishPrice("12.345")).toBe(12.35);
    expect(validateDishPrice("", 0)).toBe(0);
    expect(validateDishPrice("0", 0)).toBe(0);
  });

  it("normalizes duplicate tags and accepts only supported image types", () => {
    expect(normalizeDishTags(" vegano, nuevo, vegano ,, ")).toEqual(["vegano", "nuevo"]);
    expect(isSupportedDishImage({ type: "image/webp" })).toBe(true);
    expect(isSupportedDishImage({ type: "image/svg+xml" })).toBe(false);
    expect(getDishImageExtension("image/jpeg")).toBe("jpg");
    expect(getDishImageExtension("image/svg+xml")).toBeNull();
  });
});
