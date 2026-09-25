import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DashboardDishes from "./DashboardDishes";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  from: vi.fn(() => {
    const query = {} as {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
    };
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
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
  it("labels and opens the create action as a new dish", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/platillos"]}>
        <DashboardDishes />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nuevo platillo" }));

    expect(screen.getByRole("heading", { name: "Nuevo platillo" })).toBeInTheDocument();
  });
});
