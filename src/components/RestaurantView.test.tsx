import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Dish, RestaurantInfo } from "@/data/restaurant";
import RestaurantView from "./RestaurantView";

const trackEventMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics", () => ({
  trackEvent: trackEventMock,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, roles: [] }),
  getDefaultRouteForRoles: () => "/login",
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({
    setDishResolver: vi.fn(),
    setRestaurantScope: vi.fn(),
    joinSharedCart: vi.fn(),
    shared: null,
  }),
  getStoredName: () => null,
}));

vi.mock("@/components/ProfileHeader", () => ({ default: () => null }));
vi.mock("@/components/CategoryStories", () => ({
  default: ({ onCategoryClick }: { onCategoryClick: (id: string) => void }) => (
    <button onClick={() => onCategoryClick("category-1")}>Entradas</button>
  ),
}));
vi.mock("@/components/DishGrid", () => ({ default: () => null }));
vi.mock("@/components/DishFeed", () => ({ default: () => null }));
vi.mock("@/components/CartFloatingButton", () => ({ default: () => null }));
vi.mock("@/components/CartModal", () => ({ default: () => null }));
vi.mock("@/components/AssistantFloatingButton", () => ({ default: () => null }));
vi.mock("@/components/AssistantModal", () => ({ default: () => null }));
vi.mock("@/components/ReviewsModal", () => ({ default: () => null }));

const restaurant = {
  id: "restaurant-1",
  name: "Dragón Dorado",
  username: "dragon-dorado",
  bio: "Sabores tradicionales",
  posts: 0,
  whatsappLink: "",
  whatsappEnabled: false,
  instagramLink: "",
  logo: "/logo.jpg",
  cuisineTemplate: "generic",
  showByRating: false,
  showRating: false,
} satisfies RestaurantInfo;

const categories = [
  { id: "category-1", name: "Entradas", image: "/category.jpg", emoji: "🥑" },
] satisfies Category[];

const dishes = [] satisfies Dish[];
const dish = {
  id: "dish-1",
  name: "Guacamole",
  description: "Con totopos",
  price: 100,
  image: "/dish.jpg",
  category: "category-1",
  rating: 4.5,
  likes: 2,
  tags: [],
  showRating: true,
} satisfies Dish;

function renderView(isPreview = false) {
  return render(
    <MemoryRouter>
      <RestaurantView
        restaurant={restaurant}
        categories={categories}
        dishes={dishes}
        isPreview={isPreview}
      />
    </MemoryRouter>,
  );
}

describe("RestaurantView analytics boundary", () => {
  beforeEach(() => {
    trackEventMock.mockReset();
  });

  it("does not track category views in preview", () => {
    renderView(true);

    fireEvent.click(screen.getByRole("button", { name: "Entradas" }));

    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("tracks category views for the normal public menu", () => {
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Entradas" }));

    expect(trackEventMock).toHaveBeenCalledWith({
      restaurantId: "restaurant-1",
      eventType: "category_view",
      categoryId: "category-1",
      isPreview: false,
    });
  });

  it("does not count dish cards as intentional dish views", () => {
    renderView();

    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("does not expose restaurant review submission in preview", () => {
    render(
      <MemoryRouter>
        <RestaurantView
          restaurant={{ ...restaurant, showRating: true }}
          categories={categories}
          dishes={[dish]}
          isPreview
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("button", { name: "Ver y dejar reseñas" })).not.toBeInTheDocument();
  });
});
