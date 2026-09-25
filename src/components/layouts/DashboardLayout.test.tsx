import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLayout from "./DashboardLayout";

const authMock = vi.hoisted(() => ({ signOut: vi.fn() }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "owner@example.com" },
    signOut: authMock.signOut,
  }),
}));

vi.mock("@/hooks/useManagedRestaurant", () => ({
  useManagedRestaurant: () => ({
    restaurant: {
      id: "restaurant-1",
      name: "Taquería Los Hermanos de Guadalajara",
      slug: "taqueria-los-hermanos",
      status: "published",
      logo_url: null,
    },
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

vi.mock("@/components/QrCodeModal", () => ({
  default: ({ open, url }: { open: boolean; url: string }) =>
    open ? <div data-testid="qr-modal">{url}</div> : null,
}));

describe("DashboardLayout MVP navigation", () => {
  beforeEach(() => {
    authMock.signOut.mockReset().mockResolvedValue(undefined);
  });

  it("uses a compact mobile label and a bounded restaurant name on desktop", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardLayout>Contenido</DashboardLayout>
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", { name: /Restaurante Taquería Los Hermanos de Guadalajara/i });
    expect(heading.querySelector("span:first-child")).toHaveTextContent("Restaurante");
    expect(heading.querySelector("span:last-child")).toHaveClass("truncate");
  });

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

  it("renders the persistent desktop sidebar with an accessible active route", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/categorias"]}>
        <DashboardLayout>Contenido</DashboardLayout>
      </MemoryRouter>,
    );

    const sidebar = screen.getByRole("complementary", { name: "Menú del restaurante" });
    expect(sidebar).toHaveClass("hidden", "w-64", "lg:fixed", "lg:flex");
    expect(within(sidebar).getByText("Taquería Los Hermanos de Guadalajara")).toBeInTheDocument();

    const navigation = within(sidebar).getByRole("navigation", { name: "Navegación principal" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(4);
    expect(within(navigation).getByRole("link", { name: "Información" })).toHaveAttribute("href", "/dashboard");
    const activeLink = within(navigation).getByRole("link", { name: "Categorías" });
    expect(activeLink).toHaveAttribute("href", "/dashboard/categorias");
    expect(activeLink).toHaveAttribute("aria-current", "page");
    expect(activeLink).toHaveClass("border-l-2", "font-semibold");
    expect(within(navigation).getByRole("link", { name: "Información" })).not.toHaveAttribute("aria-current");
    expect(within(navigation).queryByRole("link", { name: "Mesas" })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole("link", { name: "Meseros" })).not.toBeInTheDocument();

    activeLink.focus();
    expect(activeLink).toHaveFocus();
  });

  it("keeps the hamburger and drawer navigation available on mobile layouts", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardLayout>Contenido</DashboardLayout>
      </MemoryRouter>,
    );

    const menuButton = screen.getByRole("button", { name: "Abrir menú" });
    expect(menuButton).toHaveClass("lg:hidden");
    fireEvent.click(menuButton);

    const mobileNavigation = await screen.findByRole("navigation", { name: "Navegación móvil" });
    expect(within(mobileNavigation).getAllByRole("link")).toHaveLength(4);
    expect(within(mobileNavigation).getByRole("link", { name: "Estadísticas" })).toBeInTheDocument();
    expect(within(mobileNavigation).queryByRole("link", { name: "Mesas" })).not.toBeInTheDocument();
    expect(within(mobileNavigation).queryByRole("link", { name: "Meseros" })).not.toBeInTheDocument();
  });

  it("keeps account context and a clearly labeled desktop logout action", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardLayout>Contenido</DashboardLayout>
      </MemoryRouter>,
    );

    const sidebar = screen.getByRole("complementary", { name: "Menú del restaurante" });
    expect(within(sidebar).getByText("owner@example.com")).toBeInTheDocument();
    fireEvent.click(within(sidebar).getByRole("button", { name: "Salir" }));

    await waitFor(() => expect(authMock.signOut).toHaveBeenCalledTimes(1));
  });

  it("keeps publication, preview, and QR actions in the desktop topbar", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/estadisticas"]}>
        <DashboardLayout>Contenido</DashboardLayout>
      </MemoryRouter>,
    );

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("button", { name: "Despublicar" })).toBeInTheDocument();
    const previewLink = within(header).getByRole("link", { name: "Vista previa del menú" });
    expect(previewLink).toHaveClass("hidden", "lg:inline-flex");
    expect(previewLink).toHaveAttribute(
      "href",
      "/r/taqueria-los-hermanos?preview=1",
    );
    const qrButton = within(header).getByRole("button", { name: "Compartir QR del menú" });
    expect(qrButton).toHaveClass("hidden", "lg:inline-flex");
    fireEvent.click(qrButton);

    expect(await screen.findByTestId("qr-modal")).toHaveTextContent(
      `${window.location.origin}/r/taqueria-los-hermanos`,
    );
  });
});
