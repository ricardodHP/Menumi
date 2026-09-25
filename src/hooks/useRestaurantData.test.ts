import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRestaurantData } from "./useRestaurantData";

const supabaseMock = vi.hoisted(() => {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = [];
  const orderCalls: Array<{ table: string; column: string; ascending: boolean | undefined }> = [];
  const restaurant = {
    id: "restaurant-1",
    name: "Dragón Dorado",
    slug: "dragon-dorado",
    bio: "Sabores tradicionales",
    logo_url: null,
    owner_id: "owner-1",
    phone: null,
    address: null,
    hours: null,
    whatsapp_link: null,
    whatsapp_enabled: true,
    instagram_link: null,
    cuisine_template: "generic",
    menu_layout: "social",
    status: "draft",
    show_by_rating: false,
    show_rating: true,
  };
  const categoryRows: Array<{
    id: string;
    name: string;
    emoji: string | null;
    image_url: string | null;
    position: number;
    is_visible: boolean;
  }> = [
    { id: "visible-category", name: "Entradas", emoji: "🥑", image_url: null, position: 0, is_visible: true },
    { id: "hidden-category", name: "Secretos", emoji: "🤫", image_url: null, position: 1, is_visible: false },
  ];
  const dishRows: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    rating: number;
    likes_count: number;
    tags: string[];
    category_id: string;
    position: number;
    is_active: boolean;
    show_rating: boolean;
  }> = [
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
      in: () => Query;
      order: (column: string, options?: { ascending?: boolean }) => Promise<{ data: typeof categoryRows | typeof dishRows; error: null }>;
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
    query.in = vi.fn(() => query) as Query["in"];
    query.order = vi.fn((column: string, options?: { ascending?: boolean }) => {
      orderCalls.push({ table, column, ascending: options?.ascending });
      return Promise.resolve({
        data: table === "categories"
          ? categoryRows
          : table === "dishes"
            ? dishRows
            : [],
        error: null,
      });
    }) as Query["order"];
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

  return {
    from,
    eqCalls,
    orderCalls,
    setRestaurantResult: (value: typeof restaurant | null) => { restaurantResult = value; },
    setImageUrls: (categoryUrl: string | null, dishUrl: string | null) => {
      categoryRows[0].image_url = categoryUrl;
      dishRows[0].image_url = dishUrl;
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: supabaseMock.from },
}));

describe("useRestaurantData publication boundary", () => {
  beforeEach(() => {
    supabaseMock.eqCalls.length = 0;
    supabaseMock.orderCalls.length = 0;
    supabaseMock.setImageUrls(null, null);
    supabaseMock.setRestaurantResult({
      id: "restaurant-1",
      name: "Dragón Dorado",
      slug: "dragon-dorado",
      bio: "Sabores tradicionales",
      logo_url: null,
      owner_id: "owner-1",
      phone: null,
      address: null,
      hours: null,
      whatsapp_link: null,
      whatsapp_enabled: true,
      instagram_link: null,
      cuisine_template: "generic",
      menu_layout: "social",
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
    expect(result.current.categories[0].image).toBe("/seed/dishes/tacos-pastor.jpg");
    expect(result.current.categories[0].hasRealImage).toBe(false);
    expect(result.current.dishes.map((dish) => dish.id)).toEqual(["visible-dish"]);
    expect(result.current.dishes[0].hasRealImage).toBe(false);
    expect(result.current.restaurant?.whatsappEnabled).toBe(true);
  });

  it("requests public categories in their persisted position order", async () => {
    const { result } = renderHook(() => useRestaurantData("dragon-dorado"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabaseMock.orderCalls).toContainEqual({
      table: "categories",
      column: "position",
      ascending: true,
    });
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

  it("maps the saved menu layout, owner and real photos to the public model", async () => {
    supabaseMock.setRestaurantResult({
      id: "restaurant-1",
      name: "Dragón Dorado",
      slug: "dragon-dorado",
      bio: "Sabores tradicionales",
      logo_url: null,
      owner_id: "owner-1",
      phone: null,
      address: null,
      hours: null,
      whatsapp_link: null,
      whatsapp_enabled: true,
      instagram_link: null,
      cuisine_template: "generic",
      menu_layout: "classic",
      status: "draft",
      show_by_rating: false,
      show_rating: true,
    });
    supabaseMock.setImageUrls("/images/entradas.jpg", "/images/guacamole.jpg");

    const { result } = renderHook(() => useRestaurantData("dragon-dorado", { preview: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.restaurant).toMatchObject({ menuLayout: "classic", ownerId: "owner-1" });
    expect(result.current.categories[0]).toMatchObject({
      image: "/images/entradas.jpg",
      hasRealImage: true,
    });
    expect(result.current.dishes[0]).toMatchObject({
      image: "/images/guacamole.jpg",
      hasRealImage: true,
    });
  });

  it("falls back to Social and seed images for an unsupported layout", async () => {
    supabaseMock.setRestaurantResult({
      id: "restaurant-1",
      name: "Dragón Dorado",
      slug: "dragon-dorado",
      bio: "Sabores tradicionales",
      logo_url: null,
      owner_id: "owner-1",
      phone: null,
      address: null,
      hours: null,
      whatsapp_link: null,
      whatsapp_enabled: true,
      instagram_link: null,
      cuisine_template: "generic",
      menu_layout: "unsupported",
      status: "draft",
      show_by_rating: false,
      show_rating: true,
    });
    supabaseMock.setImageUrls(null, null);

    const { result } = renderHook(() => useRestaurantData("dragon-dorado", { preview: true }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.restaurant?.menuLayout).toBe("social");
    expect(result.current.categories[0]).toMatchObject({
      image: "/seed/dishes/tacos-pastor.jpg",
      hasRealImage: false,
    });
    expect(result.current.dishes[0]).toMatchObject({
      image: "/seed/dishes/tacos-pastor.jpg",
      hasRealImage: false,
    });
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
