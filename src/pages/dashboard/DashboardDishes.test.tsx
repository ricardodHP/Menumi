import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardDishes from "./DashboardDishes";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  categories: [] as Array<{ id: string; name: string }>,
  dishes: [] as Array<Record<string, unknown>>,
  from: vi.fn((table: string) => {
    const query = {} as {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
    };
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() =>
      Promise.resolve({ data: table === "categories" ? mocks.categories : mocks.dishes, error: null }),
    );
    return query;
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "owner@example.com" }, signOut: mocks.signOut }),
}));

vi.mock("@/hooks/useManagedRestaurant", () => ({
  useManagedRestaurant: () => ({
    restaurant: {
      id: "restaurant-1",
      name: "Menumi Test",
      slug: "menumi-test",
      status: "published",
      logo_url: null,
    },
    loading: false,
    reload: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/components/QrCodeModal", () => ({ default: () => null }));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("DashboardDishes contextual actions", () => {
  beforeEach(() => {
    mocks.categories = [];
    mocks.dishes = [];
  });

  it("labels and opens the create action as a new dish", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/platillos"]}>
        <DashboardDishes />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.queryByText("Cargando...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Nuevo platillo" }));

    expect(screen.getByRole("heading", { name: "Nuevo platillo" })).toBeInTheDocument();
  });

  it("applies the category filter supplied by the category navigation link", async () => {
    mocks.categories = [{ id: "category-pasta", name: "Pastas" }];
    const dish = (id: string, name: string, categoryId: string) => ({
      id,
      name,
      description: null,
      price: 10,
      image_url: null,
      rating: 0,
      likes_count: 0,
      tags: [],
      is_featured: false,
      is_active: true,
      show_rating: true,
      category_id: categoryId,
      position: 0,
    });
    mocks.dishes = [
      dish("dish-pasta", "Pasta Alfredo", "category-pasta"),
      dish("dish-soup", "Caldo", "category-soup"),
    ];

    render(
      <MemoryRouter initialEntries={["/dashboard/platillos?category=category-pasta"]}>
        <DashboardDishes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Pasta Alfredo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Caldo" })).not.toBeInTheDocument();
  });
});
