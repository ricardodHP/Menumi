import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Dish, RestaurantInfo } from "@/data/restaurant";
import RestaurantPublic from "./RestaurantPublic";

const useRestaurantDataMock = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useRestaurantData", () => ({
  useRestaurantData: useRestaurantDataMock,
}));

vi.mock("@/hooks/useTableSession", () => ({
  useTableSession: () => ({ session: null, leave: vi.fn() }),
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
  instagramLink: "",
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
  });
});
