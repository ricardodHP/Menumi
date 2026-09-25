import { fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dish, RestaurantInfo } from "@/data/restaurant";
import CartModal from "./CartModal";

const setIsCartOpenMock = vi.fn();
const setSelectionNoteMock = vi.fn();
const updateQuantityMock = vi.fn();
const trackEventMock = vi.hoisted(() => vi.fn());
const restaurantState = vi.hoisted(() => ({ restaurant: null as RestaurantInfo | null }));
const tableSessionState = vi.hoisted(() => ({
  session: null as null | { restaurant_slug: string; code: string; table_label: string },
}));

const cartState = vi.hoisted(() => ({
  items: [] as Array<{ dish: Dish; quantity: number }>,
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  clearCart: vi.fn(),
  totalItems: 0,
  totalPrice: 0,
  isCartOpen: true,
  setIsCartOpen: vi.fn(),
  shared: null,
  createSharedCart: vi.fn(),
  leaveSharedCart: vi.fn(),
  participants: [] as string[],
  selectionNote: "",
  setSelectionNote: vi.fn(),
}));

const restaurant: RestaurantInfo = {
  id: "restaurant-a",
  name: "Pasta Bella",
  username: "pasta-bella",
  bio: "Pasta",
  posts: 1,
  whatsappLink: "",
  whatsappEnabled: false,
  instagramUsername: "",
  logo: "/logo.jpg",
  menuLayout: "social",
  ownerId: null,
  cuisineTemplate: "generic",
  showByRating: false,
  showRating: false,
};

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    ...cartState,
    setIsCartOpen: setIsCartOpenMock,
    setSelectionNote: setSelectionNoteMock,
    updateQuantity: updateQuantityMock,
  }),
  getStoredName: () => null,
}));

vi.mock("@/hooks/useRestaurantData", () => ({
  useRestaurantData: (slug: string) => {
    const baseRestaurant = restaurantState.restaurant;
    const tenantOverrides: Record<string, Partial<RestaurantInfo>> = {
      "restaurant-a": { id: "restaurant-a", whatsappLink: "+52 55 1234 5678" },
      "restaurant-b": { id: "restaurant-b", whatsappLink: "+52 33 9876 5432" },
    };
    return {
      restaurant: baseRestaurant
        ? { ...baseRestaurant, ...tenantOverrides[slug], username: slug }
        : null,
      loading: false,
    };
  },
}));

vi.mock("@/lib/analytics", () => ({ trackEvent: trackEventMock }));

vi.mock("@/hooks/useTableSession", () => ({
  useTableSession: () => tableSessionState,
}));

vi.mock("@/components/SharedCartQrModal", () => ({
  default: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

function renderModal(isPreview = false, slug = "pasta-bella") {
  return render(
    <MemoryRouter initialEntries={[`/r/${slug}`]}>
      <Routes>
        <Route path="/r/:slug" element={<CartModal isPreview={isPreview} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CartModal local selection copy", () => {
  beforeEach(() => {
    setIsCartOpenMock.mockReset();
    setSelectionNoteMock.mockReset();
    updateQuantityMock.mockReset();
    cartState.items = [];
    cartState.totalItems = 0;
    cartState.totalPrice = 0;
    cartState.selectionNote = "";
    tableSessionState.session = null;
    restaurantState.restaurant = { ...restaurant, whatsappLink: "", whatsappEnabled: false };
    trackEventMock.mockReset();
  });

  it("uses Mi pedido and provides an empty state that returns to browsing", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Mi pedido (0)" })).toBeInTheDocument();
    expect(screen.getByText("Aún no has agregado platillos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir explorando" })).toBeInTheDocument();
  });

  it("shows the selection note and current total, and removes an item at zero", () => {
    const dish: Dish = {
      id: "dish-a",
      description: "Pasta",
      category: "main",
      rating: 4.8,
      likes: 10,
      tags: [],
      showRating: true,
      image: "/lasagna.jpg",
      name: "Lasagna",
      price: 180,
    };
    const selectionItem = {
      dish,
      quantity: 1,
    };
    cartState.items = [selectionItem];
    cartState.totalItems = 1;
    cartState.totalPrice = 180;

    renderModal();

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getAllByText("$180.00 MXN")).toHaveLength(2);
    expect(screen.getByLabelText("Nota para tu selección (opcional)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar Lasagna" }));
    expect(updateQuantityMock).toHaveBeenCalledWith("dish-a", 0);
  });

  it("treats quantity changes as selection management, not a new selection_add", () => {
    const dish: Dish = {
      id: "dish-a", name: "Lasagna", description: "Pasta", price: 180,
      image: "/lasagna.jpg", category: "main", rating: 4.8, likes: 10,
      tags: [], showRating: true,
    };
    cartState.items = [{ dish, quantity: 1 }];
    cartState.totalItems = 1;
    cartState.totalPrice = 180;

    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Aumentar Lasagna" }));

    expect(updateQuantityMock).toHaveBeenCalledWith("dish-a", 2);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("keeps the public Mi pedido modal review-only even when a table session exists", () => {
    const dish: Dish = {
      id: "dish-a",
      description: "Pasta",
      category: "main",
      rating: 4.8,
      likes: 10,
      tags: [],
      showRating: true,
      image: "/lasagna.jpg",
      name: "Lasagna",
      price: 100,
    };
    const secondDish: Dish = { ...dish, id: "dish-b", name: "Sushi", price: 75 };
    cartState.items = [
      { dish, quantity: 2 },
      { dish: secondDish, quantity: 3 },
    ];
    cartState.totalItems = 5;
    cartState.totalPrice = 425;
    cartState.selectionNote = "Sin cebolla";
    tableSessionState.session = {
      restaurant_slug: "pasta-bella",
      code: "table-code",
      table_label: "Mesa 4",
    };

    renderModal();

    expect(screen.getByRole("heading", { name: "Mi pedido (5)" })).toBeInTheDocument();
    expect(screen.getByText("Lasagna")).toBeInTheDocument();
    expect(screen.getByText("Sushi")).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("3", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("$200.00 MXN")).toBeInTheDocument();
    expect(screen.getByText("$225.00 MXN")).toBeInTheDocument();
    expect(screen.getByLabelText("Nota para tu selección (opcional)")).toHaveValue("Sin cebolla");
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$425.00 MXN")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enviar a la mesa/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Pedido enviado|El mesero ya lo ve/i)).not.toBeInTheDocument();
  });

  it("shows no WhatsApp action for disabled or invalid restaurant configuration", () => {
    const dish: Dish = {
      id: "dish-a", name: "Lasagna", description: "Pasta", price: 180,
      image: "/lasagna.jpg", category: "main", rating: 4.8, likes: 10,
      tags: [], showRating: true,
    };
    cartState.items = [{ dish, quantity: 1 }];
    cartState.totalItems = 1;
    cartState.totalPrice = 180;
    restaurantState.restaurant = {
      ...restaurant,
      whatsappEnabled: true,
      whatsappLink: "https://example.com/not-whatsapp",
    };

    const { rerender } = renderModal();
    expect(screen.queryByRole("button", { name: /WhatsApp/i })).not.toBeInTheDocument();

    restaurantState.restaurant = {
      ...restaurant,
      whatsappEnabled: false,
      whatsappLink: "+52 55 1234 5678",
    };
    rerender(
      <MemoryRouter initialEntries={["/r/pasta-bella"]}>
        <Routes><Route path="/r/:slug" element={<CartModal />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /WhatsApp/i })).not.toBeInTheDocument();

    restaurantState.restaurant = {
      ...restaurant,
      whatsappEnabled: true,
      whatsappLink: "",
    };
    rerender(
      <MemoryRouter initialEntries={["/r/pasta-bella"]}>
        <Routes><Route path="/r/:slug" element={<CartModal />} /></Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: /WhatsApp/i })).not.toBeInTheDocument();
  });

  it("opens the configured tenant destination and records whatsapp_clicked once", () => {
    const dish: Dish = {
      id: "dish-a", name: "Lasagna", description: "Pasta", price: 180,
      image: "/lasagna.jpg", category: "main", rating: 4.8, likes: 10,
      tags: [], showRating: true,
    };
    cartState.items = [{ dish, quantity: 2 }];
    cartState.totalItems = 2;
    cartState.totalPrice = 360;
    cartState.selectionNote = "Sin cebolla";
    restaurantState.restaurant = {
      ...restaurant,
      whatsappEnabled: true,
      whatsappLink: "https://wa.me/525512345678",
    };
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderModal();
    fireEvent.click(screen.getByRole("button", { name: /Pedir por WhatsApp/i }));

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith({
      restaurantId: "restaurant-a",
      eventType: "whatsapp_clicked",
      isPreview: false,
    });
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/wa\.me\/525512345678\?text=/),
      "_blank",
      "noopener,noreferrer",
    );
    expect(decodeURIComponent(openSpy.mock.calls[0][0] as string)).toContain("2 × Lasagna — $360.00 MXN");
    expect(decodeURIComponent(openSpy.mock.calls[0][0] as string)).toContain("Notas:\nSin cebolla");
    openSpy.mockRestore();
  });

  it("uses the destination for the currently viewed restaurant after a tenant change", () => {
    const dish: Dish = {
      id: "dish-a", name: "Lasagna", description: "Pasta", price: 180,
      image: "/lasagna.jpg", category: "main", rating: 4.8, likes: 10,
      tags: [], showRating: true,
    };
    cartState.items = [{ dish, quantity: 1 }];
    cartState.totalItems = 1;
    cartState.totalPrice = 180;
    restaurantState.restaurant = { ...restaurant, whatsappEnabled: true };
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    render(
      <MemoryRouter initialEntries={["/r/restaurant-a"]}>
        <Link to="/r/restaurant-b">Ver restaurante B</Link>
        <Routes><Route path="/r/:slug" element={<CartModal />} /></Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Pedir por WhatsApp/i }));
    fireEvent.click(screen.getByRole("link", { name: "Ver restaurante B" }));
    fireEvent.click(screen.getByRole("button", { name: /Pedir por WhatsApp/i }));

    expect(openSpy.mock.calls[0][0]).toMatch(/^https:\/\/wa\.me\/525512345678\?/);
    expect(openSpy.mock.calls[1][0]).toMatch(/^https:\/\/wa\.me\/523398765432\?/);
    expect(trackEventMock.mock.calls.map(([event]) => event.restaurantId)).toEqual([
      "restaurant-a", "restaurant-b",
    ]);
    openSpy.mockRestore();
  });

  it("does not show an actionable WhatsApp submission for an empty selection", () => {
    restaurantState.restaurant = {
      ...restaurant,
      whatsappEnabled: true,
      whatsappLink: "+52 55 1234 5678",
    };

    renderModal();

    expect(screen.queryByRole("button", { name: /WhatsApp/i })).not.toBeInTheDocument();
  });

  it("allows preview to open the link without recording analytics", () => {
    const dish: Dish = {
      id: "dish-a", name: "Lasagna", description: "Pasta", price: 180,
      image: "/lasagna.jpg", category: "main", rating: 4.8, likes: 10,
      tags: [], showRating: true,
    };
    cartState.items = [{ dish, quantity: 1 }];
    cartState.totalItems = 1;
    cartState.totalPrice = 180;
    restaurantState.restaurant = {
      ...restaurant,
      whatsappEnabled: true,
      whatsappLink: "+52 55 1234 5678",
    };
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    renderModal(true);
    fireEvent.click(screen.getByRole("button", { name: /Pedir por WhatsApp/i }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(trackEventMock).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
