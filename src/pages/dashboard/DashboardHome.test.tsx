import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DashboardHome from "./DashboardHome";

const restaurant = {
  id: "restaurant-1",
  name: "Dragón Dorado",
  slug: "dragon-dorado",
  bio: "Sabores tradicionales",
  phone: "+523312345678",
  address: "Calle Hidalgo 45",
  hours: "Mar-Dom 12:00-22:00",
  whatsapp_link: "https://wa.me/523312345678",
  instagram_link: "https://instagram.com/dragondorado",
  cuisine_template: "generic",
  show_by_rating: false,
  show_rating: true,
  status: "published",
  logo_url: null,
};

vi.mock("@/hooks/useManagedRestaurant", () => ({
  useManagedRestaurant: () => ({
    restaurant,
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
    from: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("DashboardHome responsive layout", () => {
  it("stacks primary actions on narrow screens and splits them from sm upward", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    const preview = screen.getByRole("link", { name: /Preview/i });
    const actions = preview.parentElement;

    expect(actions).toHaveClass("grid-cols-1", "sm:grid-cols-2");
  });

  it("keeps the dashboard content constrained and padded responsively", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    const main = screen.getByRole("main");

    expect(main).toHaveClass("w-full", "min-w-0", "px-4", "sm:px-6", "lg:px-8");
    expect(main).toHaveClass("max-w-6xl");
  });
});
