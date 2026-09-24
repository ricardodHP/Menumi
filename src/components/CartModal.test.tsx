import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dish, RestaurantInfo } from "@/data/restaurant";
import CartModal from "./CartModal";

const setIsCartOpenMock = vi.fn();
const setSelectionNoteMock = vi.fn();
const updateQuantityMock = vi.fn();
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
  instagramLink: "",
  logo: "/logo.jpg",
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
  useRestaurantData: () => ({ restaurant }),
}));

vi.mock("@/hooks/useTableSession", () => ({
  useTableSession: () => tableSessionState,
}));

vi.mock("@/components/SharedCartQrModal", () => ({
  default: () => null,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

function renderModal() {
  return render(
    <MemoryRouter initialEntries={["/r/pasta-bella"]}>
      <Routes>
        <Route path="/r/:slug" element={<CartModal />} />
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
});
