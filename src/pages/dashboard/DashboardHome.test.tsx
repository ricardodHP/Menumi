import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import DashboardHome from "./DashboardHome";

const supabaseMock = vi.hoisted(() => {
  const updatePayloads: unknown[] = [];
  const rpcCalls: unknown[] = [];
  let rpcError: { message: string } | null = null;
  return {
    updatePayloads,
    rpcCalls,
    setRpcError: (error: { message: string } | null) => { rpcError = error; },
    rpc: vi.fn((...args: unknown[]) => {
      rpcCalls.push(args);
      return Promise.resolve({ error: rpcError });
    }),
    from: vi.fn((table: string) => {
      if (table === "restaurants") return {
        update: vi.fn((payload: unknown) => {
          updatePayloads.push(payload);
          return { eq: vi.fn(() => Promise.resolve({ error: null })) };
        }),
      };
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      };
      return query;
    }),
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
  whatsapp_enabled: true,
  instagram_link: "https://instagram.com/dragondorado",
  cuisine_template: "generic",
  show_by_rating: false,
  show_rating: true,
  allow_reviews: true,
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

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("DashboardHome responsive layout", () => {
  beforeEach(() => {
    supabaseMock.updatePayloads.length = 0;
    supabaseMock.rpcCalls.length = 0;
    supabaseMock.setRpcError(null);
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

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Dragón Dorado Café" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled());
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

  it("loads a legacy wa.me URL as a phone number and saves the optional setting", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("WhatsApp (teléfono)")).toHaveValue("+523312345678");
    expect(screen.getByRole("switch", { name: /Mostrar opción en Mi pedido/i })).toBeChecked();

    fireEvent.click(screen.getByRole("switch", { name: /Mostrar opción en Mi pedido/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(supabaseMock.updatePayloads).toHaveLength(1));
    expect(supabaseMock.updatePayloads[0]).toMatchObject({
      whatsapp_link: "+523312345678",
      whatsapp_enabled: false,
    });
  });

  it("makes both popular sort states explicit and persists the selected rating mode", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    const sortSelect = screen.getByRole("combobox", { name: "Ordenar populares por" });
    expect(sortSelect).toHaveTextContent("Likes");
    fireEvent.click(sortSelect);
    fireEvent.click(await screen.findByRole("option", { name: "Calificación" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(supabaseMock.updatePayloads).toHaveLength(1));
    expect(supabaseMock.updatePayloads[0]).toMatchObject({ show_by_rating: true });
  });

  it("saves public rating visibility separately from restaurant review submissions", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Mostrar calificación del restaurante" }));
    fireEvent.click(screen.getByRole("switch", { name: "Permitir nuevas reseñas del restaurante" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(supabaseMock.updatePayloads).toHaveLength(1));
    expect(supabaseMock.updatePayloads[0]).toMatchObject({
      show_rating: false,
      allow_reviews: false,
    });
  });

  it("keeps hours changes dirty and retryable when only the general update succeeds", async () => {
    supabaseMock.setRpcError({ message: "database unavailable" });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <DashboardHome />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByRole("button", { name: "Configurar horario semanal" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Dragón Dorado Nuevo" } });
    fireEvent.click(screen.getByRole("button", { name: "Configurar horario semanal" }));
    await waitFor(() => expect(screen.getByRole("switch", { name: "Abrir Lun" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("switch", { name: "Abrir Lun" }));
    await waitFor(() => expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(supabaseMock.rpcCalls).toHaveLength(1));
    expect(await screen.findByText("Cambios sin guardar")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Dragón Dorado Nuevo");
    expect(screen.getByLabelText("Apertura Lun")).toHaveValue("09:00");
    expect(supabaseMock.updatePayloads).toHaveLength(1);

    supabaseMock.setRpcError(null);
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(supabaseMock.rpcCalls).toHaveLength(2));
    expect(supabaseMock.rpcCalls[1]).toEqual(supabaseMock.rpcCalls[0]);
    expect(supabaseMock.updatePayloads).toHaveLength(2);
    await waitFor(() => expect(screen.queryByText("Cambios sin guardar")).not.toBeInTheDocument());
  });
});
