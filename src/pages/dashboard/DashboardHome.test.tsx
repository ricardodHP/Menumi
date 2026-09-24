import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import DashboardHome from "./DashboardHome";

const supabaseMock = vi.hoisted(() => {
  const updatePayloads: unknown[] = [];
  return {
    updatePayloads,
    from: vi.fn(() => ({
      update: vi.fn((payload: unknown) => {
        updatePayloads.push(payload);
        return { eq: vi.fn(() => Promise.resolve({ error: null })) };
      }),
    })),
  };
});

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
  supabase: supabaseMock,
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/QrCodeModal", () => ({
  default: ({ open, url }: { open: boolean; url: string }) =>
    open ? <div data-testid="qr-url">{url}</div> : null,
}));

describe("DashboardHome responsive layout", () => {
  beforeEach(() => {
    supabaseMock.updatePayloads.length = 0;
  });

  it("stacks primary actions on narrow screens and splits them from sm upward", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    const preview = screen.getByRole("link", { name: /Vista previa/i });
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

  it("uses preview for drafts, keeps the public URL stable, and does not overwrite status on save", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Vista previa/i })).toHaveAttribute(
      "href",
      "/r/dragon-dorado?preview=1",
    );
    expect(screen.getByText(`${window.location.origin}/r/dragon-dorado`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(supabaseMock.updatePayloads).toHaveLength(1));
    expect(supabaseMock.updatePayloads[0]).not.toHaveProperty("status");
  });

  it("passes the public URL without preview to the QR modal", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Compartir QR/i }));

    expect(screen.getByTestId("qr-url")).toHaveTextContent(
      `${window.location.origin}/r/dragon-dorado`,
    );
    expect(screen.getByTestId("qr-url")).not.toHaveTextContent("preview");
  });
});
