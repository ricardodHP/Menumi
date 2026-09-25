import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Dish, RestaurantInfo } from "@/data/restaurant";
import RestaurantPublic from "./RestaurantPublic";

const useRestaurantDataMock = vi.hoisted(() => vi.fn());
const trackMenuViewOnceMock = vi.hoisted(() => vi.fn());
const authMock = vi.hoisted(() => ({
  user: null as { id: string } | null,
  isAdmin: false,
  isOwner: false,
}));

vi.mock("@/hooks/useRestaurantData", () => ({
  useRestaurantData: useRestaurantDataMock,
}));

vi.mock("@/hooks/useTableSession", () => ({
  useTableSession: () => ({ session: null, leave: vi.fn() }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authMock,
}));

vi.mock("@/lib/analytics", () => ({
  trackMenuViewOnce: trackMenuViewOnceMock,
}));

vi.mock("@/components/RestaurantView", () => ({
  default: ({ restaurant }: { restaurant: RestaurantInfo }) => (
    <div>
      Menú de {restaurant.name}
      <span data-testid="menu-layout">{restaurant.menuLayout}</span>
      <span data-testid="cuisine-template">{restaurant.cuisineTemplate}</span>
    </div>
  ),
}));

const restaurant = {
  id: "restaurant-1",
  name: "Dragón Dorado",
  username: "dragon-dorado",
  bio: "Sabores tradicionales",
  posts: 0,
  whatsappLink: "",
  whatsappEnabled: false,
  instagramUsername: "",
  logo: "/seed/restaurant-logo.png",
  menuLayout: "social",
  ownerId: "owner-1",
  cuisineTemplate: "generic",
  showByRating: false,
  showRating: true,
} satisfies RestaurantInfo;

const emptyMenu = {
  loading: false,
  notFound: false,
  restaurant,
  categories: [] as Category[],
  dishes: [] as Dish[],
};

describe("RestaurantPublic preview boundary", () => {
  beforeEach(() => {
    useRestaurantDataMock.mockReset();
    useRestaurantDataMock.mockReturnValue(emptyMenu);
    trackMenuViewOnceMock.mockReset();
    authMock.user = null;
    authMock.isAdmin = false;
    authMock.isOwner = false;
  });

  it("uses preview mode explicitly and explains when a draft is being inspected", () => {
    render(
      <MemoryRouter initialEntries={["/r/dragon-dorado?preview=1"]}>
        <Routes>
          <Route path="/r/:slug" element={<RestaurantPublic />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useRestaurantDataMock).toHaveBeenCalledWith("dragon-dorado", { preview: true });
    expect(screen.getByText(/vista previa/i)).toBeInTheDocument();
    expect(screen.getByText("Menú de Dragón Dorado")).toBeInTheDocument();
    expect(trackMenuViewOnceMock).toHaveBeenCalledWith({ restaurantId: "restaurant-1", isPreview: true });
  });

  it("uses the published boundary for the regular public URL", () => {
    authMock.user = { id: "owner-1" };
    authMock.isOwner = true;

    render(
      <MemoryRouter initialEntries={["/r/dragon-dorado?menu_layout=gallery&cuisine_template=japanese"]}>
        <Routes>
          <Route path="/r/:slug" element={<RestaurantPublic />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useRestaurantDataMock).toHaveBeenCalledWith("dragon-dorado", { preview: false });
    expect(screen.queryByText(/vista previa/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("menu-layout")).toHaveTextContent("social");
    expect(screen.getByTestId("cuisine-template")).toHaveTextContent("generic");
    expect(trackMenuViewOnceMock).toHaveBeenCalledTimes(1);
    expect(trackMenuViewOnceMock).toHaveBeenCalledWith({ restaurantId: "restaurant-1", isPreview: false });
  });

  it("applies valid pending layout and theme for the restaurant owner in preview", () => {
    authMock.user = { id: "owner-1" };
    authMock.isOwner = true;

    render(
      <MemoryRouter initialEntries={["/r/dragon-dorado?preview=1&menu_layout=classic&cuisine_template=chinese"]}>
        <Routes>
          <Route path="/r/:slug" element={<RestaurantPublic />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("menu-layout")).toHaveTextContent("classic");
    expect(screen.getByTestId("cuisine-template")).toHaveTextContent("chinese");
  });

  it("allows an admin to inspect pending settings for a restaurant", () => {
    authMock.user = { id: "admin-1" };
    authMock.isAdmin = true;

    render(
      <MemoryRouter initialEntries={["/r/dragon-dorado?preview=1&menu_layout=gallery&cuisine_template=italian"]}>
        <Routes>
          <Route path="/r/:slug" element={<RestaurantPublic />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("menu-layout")).toHaveTextContent("gallery");
    expect(screen.getByTestId("cuisine-template")).toHaveTextContent("italian");
  });

  it("ignores pending settings when a different owner opens the preview", () => {
    authMock.user = { id: "owner-2" };
    authMock.isOwner = true;

    render(
      <MemoryRouter initialEntries={["/r/dragon-dorado?preview=1&menu_layout=gallery&cuisine_template=japanese"]}>
        <Routes>
          <Route path="/r/:slug" element={<RestaurantPublic />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("menu-layout")).toHaveTextContent("social");
    expect(screen.getByTestId("cuisine-template")).toHaveTextContent("generic");
  });

  it("falls back to saved values for invalid preview overrides", () => {
    const savedSettings = {
      ...restaurant,
      menuLayout: "gallery",
      cuisineTemplate: "chinese",
    } satisfies RestaurantInfo;
    useRestaurantDataMock.mockReturnValue({ ...emptyMenu, restaurant: savedSettings });
    authMock.user = { id: "owner-1" };
    authMock.isOwner = true;

    render(
      <MemoryRouter initialEntries={["/r/dragon-dorado?preview=1&menu_layout=unexpected&cuisine_template=unexpected"]}>
        <Routes>
          <Route path="/r/:slug" element={<RestaurantPublic />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("menu-layout")).toHaveTextContent("gallery");
    expect(screen.getByTestId("cuisine-template")).toHaveTextContent("chinese");
  });

  it("renders the unavailable state for an invalid slug", () => {
    useRestaurantDataMock.mockReturnValue({
      ...emptyMenu,
      loading: false,
      notFound: true,
      restaurant: null,
    });

    render(
      <MemoryRouter initialEntries={["/r/invalid-slug"]}>
        <Routes>
          <Route path="/r/:slug" element={<RestaurantPublic />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Restaurante no encontrado")).toBeInTheDocument();
    expect(trackMenuViewOnceMock).not.toHaveBeenCalled();
  });
});
