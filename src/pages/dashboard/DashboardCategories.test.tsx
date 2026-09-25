import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardCategories from "./DashboardCategories";

const categories = [
  {
    id: "category-1",
    name: "Entradas",
    emoji: "🥑",
    position: 0,
    is_visible: true,
  },
];
const updateCategory = vi.fn();

vi.mock("@/hooks/useManagedRestaurant", () => ({
  useManagedRestaurant: () => ({
    restaurant: { id: "restaurant-1", status: "draft" },
    loading: false,
    reload: vi.fn(),
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "owner@example.com" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table !== "categories") return {};
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: categories, error: null })),
          })),
        })),
        update: updateCategory,
      };
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("DashboardCategories visibility", () => {
  beforeEach(() => {
    updateCategory.mockReset();
    updateCategory.mockReturnValue({
      eq: vi.fn(() => Promise.resolve({ error: null })),
    });
  });

  it("lets the owner hide a category from the public menu", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/categorias"]}>
        <DashboardCategories />
      </MemoryRouter>,
    );

    const visibilitySwitch = await screen.findByRole("switch", { name: "Visible en el menú" });
    fireEvent.click(visibilitySwitch);

    await waitFor(() => {
      expect(updateCategory).toHaveBeenCalledWith({ is_visible: false });
    });
  });

  it("labels the create action with the category resource", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/categorias"]}>
        <DashboardCategories />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Nueva categoría" })).toBeInTheDocument();
  });
});
