import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";
import type { Dish } from "@/data/restaurant";
import { CartProvider, useCart } from "./CartContext";

const dishA: Dish = {
  id: "dish-a",
  name: "Lasagna",
  description: "Pasta",
  price: 180,
  image: "/lasagna.jpg",
  category: "main",
  rating: 4.8,
  likes: 10,
  tags: [],
  showRating: true,
};

const dishB: Dish = {
  ...dishA,
  id: "dish-b",
  name: "Sushi",
  price: 220,
};

const CartTestWrapper = ({ children }: { children: ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

function renderCartHook() {
  return renderHook(useCart, { wrapper: CartTestWrapper });
}

describe("CartProvider local selection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("increments duplicate dishes, removes quantity one, and recalculates totals", () => {
    const { result } = renderCartHook();

    act(() => result.current.setRestaurantScope("restaurant-a", [dishA]));
    act(() => result.current.addItem(dishA));
    act(() => result.current.addItem(dishA));

    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.totalItems).toBe(2);
    expect(result.current.totalPrice).toBe(360);

    act(() => result.current.updateQuantity(dishA.id, 1));
    act(() => result.current.updateQuantity(dishA.id, 0));

    expect(result.current.items).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it("clears the note and persisted note when the final item is removed individually", () => {
    const { result } = renderCartHook();

    act(() => result.current.setRestaurantScope("restaurant-a", [dishA]));
    act(() => result.current.addItem(dishA));
    act(() => result.current.setSelectionNote("Sin cebolla"));
    act(() => result.current.updateQuantity(dishA.id, 0));

    expect(result.current.items).toEqual([]);
    expect(result.current.selectionNote).toBe("");
    expect(window.localStorage.getItem("menumi:selection:restaurant-a")).toBe(
      JSON.stringify({ items: [], note: "" }),
    );

    act(() => result.current.addItem(dishA));
    expect(result.current.selectionNote).toBe("");
  });

  it("clears the note when hydration discards every stale item", () => {
    window.localStorage.setItem(
      "menumi:selection:restaurant-a",
      JSON.stringify({ items: [{ dishId: "deleted", quantity: 1 }], note: "Nota anterior" }),
    );
    const { result } = renderCartHook();

    act(() => result.current.setRestaurantScope("restaurant-a", [dishA]));

    expect(result.current.items).toEqual([]);
    expect(result.current.selectionNote).toBe("");
    expect(window.localStorage.getItem("menumi:selection:restaurant-a")).toBe(
      JSON.stringify({ items: [], note: "" }),
    );
  });

  it("calculates totals across multiple products and quantities", () => {
    const { result } = renderCartHook();
    const hundredDollarDish = { ...dishA, price: 100 };
    const seventyFiveDollarDish = { ...dishB, price: 75 };

    act(() => result.current.setRestaurantScope("restaurant-a", [hundredDollarDish, seventyFiveDollarDish]));
    act(() => {
      result.current.addItem(hundredDollarDish);
      result.current.addItem(hundredDollarDish);
      result.current.addItem(seventyFiveDollarDish);
      result.current.addItem(seventyFiveDollarDish);
      result.current.addItem(seventyFiveDollarDish);
    });

    expect(result.current.totalPrice).toBe(425);
  });

  it("keeps selections isolated per restaurant and restores each one", () => {
    const { result } = renderCartHook();

    act(() => result.current.setRestaurantScope("restaurant-a", [dishA]));
    act(() => result.current.addItem(dishA));
    act(() => result.current.setRestaurantScope("restaurant-b", [dishB]));

    expect(result.current.items).toEqual([]);

    act(() => result.current.addItem(dishB));
    act(() => result.current.setRestaurantScope("restaurant-a", [dishA]));
    expect(result.current.items.map((item) => item.dish.id)).toEqual([dishA.id]);

    act(() => result.current.setRestaurantScope("restaurant-b", [dishB]));
    expect(result.current.items.map((item) => item.dish.id)).toEqual([dishB.id]);
  });

  it("restores IDs after a provider refresh using current dish data", () => {
    const first = renderCartHook();
    act(() => first.result.current.setRestaurantScope("restaurant-a", [dishA]));
    act(() => first.result.current.addItem(dishA));
    act(() => first.result.current.setSelectionNote("Sin cebolla"));
    first.unmount();

    const refreshedDish = { ...dishA, price: 195 };
    const second = renderCartHook();
    act(() => second.result.current.setRestaurantScope("restaurant-a", [refreshedDish]));

    expect(second.result.current.items[0].dish).toEqual(refreshedDish);
    expect(second.result.current.totalPrice).toBe(195);
    expect(second.result.current.selectionNote).toBe("Sin cebolla");
  });

  it("discards deleted or hidden dishes during hydration", () => {
    const first = renderCartHook();
    act(() => first.result.current.setRestaurantScope("restaurant-a", [dishA, dishB]));
    act(() => first.result.current.addItem(dishA));
    act(() => first.result.current.addItem(dishB));
    first.unmount();

    const second = renderCartHook();
    act(() => second.result.current.setRestaurantScope("restaurant-a", [dishA]));

    expect(second.result.current.items.map((item) => item.dish.id)).toEqual([dishA.id]);
  });

  it("does not add a dish outside the current restaurant catalog", () => {
    const { result } = renderCartHook();

    act(() => result.current.setRestaurantScope("restaurant-a", [dishA]));
    act(() => result.current.addItem(dishB));

    expect(result.current.items).toEqual([]);
  });

  it("prevents adding an unavailable dish and removes it when hydrating a saved order", () => {
    const unavailableDish = { ...dishA, isAvailable: false };
    const first = renderCartHook();
    act(() => first.result.current.setRestaurantScope("restaurant-a", [dishA]));
    act(() => first.result.current.addItem(dishA));
    first.unmount();

    const second = renderCartHook();
    act(() => second.result.current.setRestaurantScope("restaurant-a", [unavailableDish]));
    act(() => second.result.current.addItem(unavailableDish));

    expect(second.result.current.items).toEqual([]);
    expect(second.result.current.totalPrice).toBe(0);
  });

  it("keeps preview selection ephemeral and does not overwrite persisted selection", () => {
    const customer = renderCartHook();
    act(() => customer.result.current.setRestaurantScope("restaurant-a", [dishA]));
    act(() => customer.result.current.addItem(dishA));
    customer.unmount();

    const preview = renderCartHook();
    act(() => preview.result.current.setRestaurantScope("restaurant-a", [dishA], { persist: false }));
    expect(preview.result.current.items).toEqual([]);
    act(() => preview.result.current.addItem(dishA));
    act(() => preview.result.current.setSelectionNote("Nota de preview"));
    act(() => preview.result.current.removeItem(dishA.id));
    expect(preview.result.current.selectionNote).toBe("");
    preview.unmount();

    expect(window.localStorage.getItem("menumi:selection:restaurant-a")).toBe(
      JSON.stringify({ items: [{ dishId: dishA.id, quantity: 1 }], note: "" }),
    );

    const publicMenu = renderCartHook();
    act(() => publicMenu.result.current.setRestaurantScope("restaurant-a", [dishA]));
    expect(publicMenu.result.current.items[0].quantity).toBe(1);
  });
});
