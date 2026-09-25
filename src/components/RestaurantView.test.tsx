import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Dish, RestaurantInfo } from "@/data/restaurant";
import RestaurantView from "./RestaurantView";

const trackEventMock = vi.hoisted(() => vi.fn());
const reviewsModalMock = vi.hoisted(() => ({ onRender: vi.fn() }));
const presentationMocks = vi.hoisted(() => ({
  classic: vi.fn(),
  gallery: vi.fn(),
  feed: vi.fn(),
  stories: vi.fn(),
}));

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
  default: (props: { activeCategory: string | null; onCategoryClick: (id: string) => void }) => {
    presentationMocks.stories(props);
    return (
      <>
        <button onClick={() => props.onCategoryClick("category-1")}>Entradas</button>
        <button onClick={() => props.onCategoryClick("populares")}>Populares</button>
      </>
    );
  },
}));
vi.mock("@/components/DishGrid", () => ({ default: () => null }));
vi.mock("@/components/DishFeed", () => ({
  default: (props: { dishes: Dish[]; startIndex: number; presentation?: string }) => {
    presentationMocks.feed(props);
    return null;
  },
}));
vi.mock("@/components/menu-layouts/ClassicMenu", () => ({
  default: (props: { activeCategory: string | null; onCategoryActivate: (id: string) => void }) => {
    presentationMocks.classic(props);
    return (
      <>
        <button onClick={() => props.onCategoryActivate("category-1")}>Classic Entradas</button>
        <button onClick={() => props.onCategoryActivate("populares")}>Classic Populares</button>
      </>
    );
  },
}));
vi.mock("@/components/menu-layouts/GalleryMenu", () => ({
  default: (props: { activeCategory: string | null; onCategoryActivate: (id: string) => void }) => {
    presentationMocks.gallery(props);
    return (
      <>
        <button onClick={() => props.onCategoryActivate("category-1")}>Gallery Entradas</button>
        <button onClick={() => props.onCategoryActivate("populares")}>Gallery Populares</button>
      </>
    );
  },
}));
vi.mock("@/components/CartFloatingButton", () => ({ default: () => null }));
vi.mock("@/components/CartModal", () => ({ default: () => null }));
vi.mock("@/components/AssistantFloatingButton", () => ({ default: () => null }));
vi.mock("@/components/AssistantModal", () => ({ default: () => null }));
vi.mock("@/components/ReviewsModal", () => ({
  default: (props: { open: boolean; allowRestaurantSubmission?: boolean }) => {
    reviewsModalMock.onRender(props);
    return props.open ? <div data-testid="restaurant-reviews-modal" /> : null;
  },
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
  logo: "/logo.jpg",
  menuLayout: "social",
  menuTheme: "light",
  ownerId: "owner-1",
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

function renderView(
  isPreview = false,
  options: { menuLayout?: RestaurantInfo["menuLayout"]; dishes?: Dish[]; route?: string } = {},
) {
  return render(
    <MemoryRouter initialEntries={[options.route ?? "/r/dragon-dorado"]}>
      <RestaurantView
        restaurant={{ ...restaurant, menuLayout: options.menuLayout ?? restaurant.menuLayout }}
        categories={categories}
        dishes={options.dishes ?? dishes}
        isPreview={isPreview}
      />
    </MemoryRouter>,
  );
}

describe("RestaurantView analytics boundary", () => {
  beforeEach(() => {
    trackEventMock.mockReset();
    presentationMocks.classic.mockReset();
    presentationMocks.gallery.mockReset();
    presentationMocks.feed.mockReset();
    presentationMocks.stories.mockReset();
  });

  it("keeps Social on its existing category experience and starts at Populares", () => {
    renderView();

    expect(presentationMocks.stories).toHaveBeenCalledWith(expect.objectContaining({ activeCategory: "populares" }));
    expect(presentationMocks.classic).not.toHaveBeenCalled();
    expect(presentationMocks.gallery).not.toHaveBeenCalled();
  });

  it("applies the selected dark theme to the public menu root", () => {
    const { container } = render(
      <MemoryRouter>
        <RestaurantView
          restaurant={{ ...restaurant, menuTheme: "dark" }}
          categories={categories}
          dishes={dishes}
        />
      </MemoryRouter>,
    );

    const themedRoot = container.querySelector("[data-menu-theme='dark']");
    expect(themedRoot).toBeInTheDocument();
    expect(themedRoot).toHaveStyle({
      "--background": "222 30% 10%",
      "--foreground": "210 25% 96%",
    });
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

  it("routes Classic and Gallery with all categories initially selected and tracks only activated categories", () => {
    const { rerender } = renderView(false, { menuLayout: "classic" });

    expect(presentationMocks.classic).toHaveBeenCalledWith(expect.objectContaining({ activeCategory: null }));
    expect(presentationMocks.stories).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Classic Populares" }));
    expect(trackEventMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Classic Entradas" }));
    expect(trackEventMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "category_view", categoryId: "category-1" }));

    rerender(
      <MemoryRouter>
        <RestaurantView restaurant={{ ...restaurant, menuLayout: "gallery" }} categories={categories} dishes={dishes} />
      </MemoryRouter>,
    );
    expect(presentationMocks.gallery).toHaveBeenCalledWith(expect.objectContaining({ activeCategory: null }));
  });

  it("does not count dish cards as intentional dish views", () => {
    renderView();

    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("opens a valid deep link in the selected presentation with only that dish", () => {
    renderView(false, {
      menuLayout: "classic",
      dishes: [dish],
      route: "/r/dragon-dorado?dish=dish-1",
    });

    expect(presentationMocks.feed).toHaveBeenCalledWith(expect.objectContaining({
      dishes: [dish],
      startIndex: 0,
      presentation: "classic",
    }));
  });

  it("does not open an invalid deep link", () => {
    renderView(false, {
      menuLayout: "gallery",
      dishes: [dish],
      route: "/r/dragon-dorado?dish=belongs-to-another-menu",
    });

    expect(presentationMocks.feed).not.toHaveBeenCalled();
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

    expect(screen.queryByRole("button", { name: "Ver reseñas del restaurante" })).not.toBeInTheDocument();
  });

  it("keeps restaurant review access when the aggregate rating is hidden", () => {
    render(
      <MemoryRouter>
        <RestaurantView
          restaurant={{ ...restaurant, showRating: false, allowReviews: false }}
          categories={categories}
          dishes={[dish]}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByText("4.5")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver reseñas del restaurante" }));
    expect(screen.getByTestId("restaurant-reviews-modal")).toBeInTheDocument();
    expect(reviewsModalMock.onRender).toHaveBeenLastCalledWith(expect.objectContaining({
      open: true,
      allowRestaurantSubmission: false,
    }));
  });
});
