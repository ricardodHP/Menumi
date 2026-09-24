import { describe, expect, it } from "vitest";
import {
  filterPublicMenuRecords,
  getRestaurantPublicPath,
  getRestaurantPublicUrl,
} from "./restaurant-public";

describe("restaurant public contracts", () => {
  it("builds the stable restaurant route and absolute URL without a duplicate slash", () => {
    expect(getRestaurantPublicPath("dragon-dorado")).toBe("/r/dragon-dorado");
    expect(getRestaurantPublicUrl("dragon-dorado", "https://menumi.example/")).toBe(
      "https://menumi.example/r/dragon-dorado",
    );
  });

  it("excludes hidden categories and every dish assigned to them", () => {
    const categories = [
      { id: "visible-category", is_visible: true },
      { id: "hidden-category", is_visible: false },
      { id: "legacy-category" },
    ];
    const dishes = [
      { id: "visible-dish", category_id: "visible-category", is_active: true },
      { id: "hidden-category-dish", category_id: "hidden-category", is_active: true },
      { id: "inactive-dish", category_id: "visible-category", is_active: false },
      { id: "uncategorized-dish", category_id: null, is_active: true },
    ];

    const result = filterPublicMenuRecords(categories, dishes);

    expect(result.categories.map((category) => category.id)).toEqual([
      "visible-category",
      "legacy-category",
    ]);
    expect(result.dishes.map((dish) => dish.id)).toEqual([
      "visible-dish",
      "uncategorized-dish",
    ]);
  });
});
