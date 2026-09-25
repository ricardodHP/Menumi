import { beforeEach, describe, expect, it } from "vitest";
import {
  getSelectionStorageKey,
  hydrateSelection,
  readSelection,
  writeSelection,
} from "./cart-selection";

const pasta = {
  id: "dish-pasta",
  name: "Lasagna",
  price: 180,
};

const sushi = {
  id: "dish-sushi",
  name: "Sushi",
  price: 220,
};

describe("cart selection persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores only selection IDs and quantities per restaurant", () => {
    writeSelection("restaurant-pasta", {
      items: [{ dishId: pasta.id, quantity: 2 }],
      note: "Sin cebolla",
    });

    expect(getSelectionStorageKey("restaurant-pasta")).toBe("menumi:selection:restaurant-pasta");
    expect(readSelection("restaurant-pasta")).toEqual({
      items: [{ dishId: pasta.id, quantity: 2 }],
      note: "Sin cebolla",
    });
    expect(window.localStorage.getItem(getSelectionStorageKey("restaurant-pasta"))).not.toContain("Lasagna");
    expect(readSelection("restaurant-sushi")).toEqual({ items: [], note: "" });
  });

  it("hydrates with current dish data and discards stale items", () => {
    const hydrated = hydrateSelection(
      {
        items: [
          { dishId: pasta.id, quantity: 2 },
          { dishId: "deleted-dish", quantity: 4 },
        ],
        note: "Salsa aparte",
      },
      [pasta],
    );

    expect(hydrated).toEqual({
      items: [{ dish: pasta, quantity: 2 }],
      note: "Salsa aparte",
    });
  });

  it("uses the current price when the dish changes before hydration", () => {
    const hydrated = hydrateSelection(
      { items: [{ dishId: sushi.id, quantity: 2 }], note: "" },
      [{ ...sushi, price: 245 }],
    );

    expect(hydrated.items[0].dish.price).toBe(245);
  });

  it("removes unavailable dishes from a persisted selection", () => {
    const hydrated = hydrateSelection(
      { items: [{ dishId: pasta.id, quantity: 3 }], note: "Sin cebolla" },
      [{ ...pasta, isAvailable: false }],
    );

    expect(hydrated.items).toEqual([]);
    expect(hydrated.note).toBe("Sin cebolla");
  });
});
