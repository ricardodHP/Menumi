import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRestaurantData } from "./useRestaurantData";

const supabaseMock = vi.hoisted(() => {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];
  const restaurant = {
    id: "restaurant-1",
    name: "Dragón Dorado",
    slug: "dragon-dorado",
    bio: "Sabores tradicionales",
    logo_url: null,
    phone: null,
    address: null,
    hours: null,
    whatsapp_link: null,
    whatsapp_enabled: true,
    instagram_link: null,
    cuisine_template: "generic",
    status: "draft",
    show_by_rating: false,
    show_rating: true,
  };
  const categoryRows = [
    { id: "visible-category", name: "Entradas", emoji: "🥑", image_url: null, position: 0, is_visible: true },
    { id: "hidden-category", name: "Secretos", emoji: "🤫", image_url: null, position: 1, is_visible: false },
  ];
  const dishRows = [
    {
      id: "visible-dish",
      name: "Guacamole",
      description: null,
      price: 100,
      image_url: null,
      rating: 4.5,
      likes_count: 2,
      tags: [],
      category_id: "visible-category",
      position: 0,
      is_active: true,
      show_rating: true,
    },
    {
      id: "hidden-category-dish",
      name: "Platillo oculto",
      description: null,
      price: 200,
      image_url: null,
      rating: 4,
      likes_count: 1,
      tags: [],
      category_id: "hidden-category",
      position: 1,
      is_active: true,
      show_rating: true,
    },
  ];
  let restaurantResult: typeof restaurant | null = restaurant;

  const from = vi.fn((table: string) => {
    let requiresPublished = false;
    type Query = {
      select: () => Query;
      eq: (column: string, value: unknown) => Query;
      order: () => Promise<{ data: typeof categoryRows | typeof dishRows; error: null }>;
      maybeSingle: () => Promise<{ data: typeof restaurant | null; error: null }>;
      not: () => Promise<{ data: Array<{ dish_id: string | null }>; error: null }>;
    };
    const query = {} as Query;
    query.select = vi.fn(() => query) as Query["select"];
    query.eq = vi.fn((column: string, value: unknown) => {
      eqCalls.push({ table, column, value });
      if (table === "restaurants" && column === "status" && value === "published") {
        requiresPublished = true;
      }
      return query;
    }) as Query["eq"];
    query.order = vi.fn(() =>
      Promise.resolve({ data: table === "categories" ? categoryRows : dishRows, error: null }),
    ) as Query["order"];
    query.maybeSingle = vi.fn(() =>
      Promise.resolve({
        data: restaurantResult
          ? { ...restaurantResult, status: requiresPublished ? "published" : restaurantResult.status }
          : null,
        error: null,
      }),
    ) as Query["maybeSingle"];
    query.not = vi.fn(() => Promise.resolve({ data: [], error: null })) as Query["not"];
    return query;
  });

  return { from, eqCalls, setRestaurantResult: (value: typeof restaurant | null) => { restaurantResult = value; } };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: supabaseMock.from },
}));

describe("useRestaurantData publication boundary", () => {
  beforeEach(() => {
    supabaseMock.eqCalls.length = 0;
    supabaseMock.setRestaurantResult({
      id: "restaurant-1",
      name: "Dragón Dorado",
      slug: "dragon-dorado",
      bio: "Sabores tradicionales",
      logo_url: null,
      phone: null,
      address: null,
      hours: null,
      whatsapp_link: null,
      whatsapp_enabled: true,
      instagram_link: null,
      cuisine_template: "generic",
      status: "draft",
      show_by_rating: false,
      show_rating: true,
    });
  });

  it("requires published status for the public route and removes hidden public content", async () => {
    const { result } = renderHook(() => useRestaurantData("dragon-dorado"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabaseMock.eqCalls).toContainEqual({
      table: "restaurants",
      column: "status",
      value: "published",
    });
    expect(result.current.categories.map((category) => category.id)).toEqual(["visible-category"]);
    expect(result.current.dishes.map((dish) => dish.id)).toEqual(["visible-dish"]);
    expect(result.current.restaurant?.whatsappEnabled).toBe(true);
  });

  it("loads a draft preview when the database authorization boundary returns it", async () => {
    const { result } = renderHook(() =>
      useRestaurantData("dragon-dorado", { preview: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabaseMock.eqCalls).not.toContainEqual({
      table: "restaurants",
      column: "status",
      value: "published",
    });
    expect(result.current.restaurant?.name).toBe("Dragón Dorado");
  });

  it("denies the regular public route when an unpublished restaurant is omitted", async () => {
    supabaseMock.setRestaurantResult(null);

    const { result } = renderHook(() => useRestaurantData("dragon-dorado"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.restaurant).toBeNull();
  });

  it("treats a draft omitted by the database authorization boundary as unavailable", async () => {
    supabaseMock.setRestaurantResult(null);

    const { result } = renderHook(() =>
      useRestaurantData("dragon-dorado", { preview: true }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.restaurant).toBeNull();
  });
});
