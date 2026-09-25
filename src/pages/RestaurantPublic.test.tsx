import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Dish, RestaurantInfo } from "@/data/restaurant";
import RestaurantPublic from "./RestaurantPublic";

const useRestaurantDataMock = vi.hoisted(() => vi.fn());
const trackMenuViewOnceMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useRestaurantData", () => ({
  useRestaurantData: useRestaurantDataMock,
}));

vi.mock("@/hooks/useTableSession", () => ({
  useTableSession: () => ({ session: null, leave: vi.fn() }),
}));

vi.mock("@/lib/analytics", () => ({
  trackMenuViewOnce: trackMenuViewOnceMock,
}));

vi.mock("@/components/RestaurantView", () => ({
  default: ({ restaurant }: { restaurant: RestaurantInfo }) => (
    <div>Menú de {restaurant.name}</div>
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
    render(
      <MemoryRouter initialEntries={["/r/dragon-dorado"]}>
        <Routes>
          <Route path="/r/:slug" element={<RestaurantPublic />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(useRestaurantDataMock).toHaveBeenCalledWith("dragon-dorado", { preview: false });
    expect(screen.queryByText(/vista previa/i)).not.toBeInTheDocument();
    expect(trackMenuViewOnceMock).toHaveBeenCalledTimes(1);
    expect(trackMenuViewOnceMock).toHaveBeenCalledWith({ restaurantId: "restaurant-1", isPreview: false });
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
