import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "owner@example.com" },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useManagedRestaurant", () => ({
  useManagedRestaurant: () => ({
    restaurant: { id: "restaurant-1", status: "published" },
    reload: vi.fn(),
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

describe("DashboardLayout MVP navigation", () => {
  it("exposes only active pilot modules in the navigation drawer", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardLayout>Contenido</DashboardLayout>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Abrir menú" }));

    expect(screen.getByRole("link", { name: "Información" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Categorías" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Platillos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Estadísticas" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mesas" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Meseros" })).not.toBeInTheDocument();
  });
});
