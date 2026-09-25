import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Dish, RestaurantInfo } from "@/data/restaurant";
import DishFeed from "./DishFeed";

const trackEventMock = vi.hoisted(() => vi.fn());
const addItemMock = vi.hoisted(() => vi.fn());
const toggleLikeMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/analytics", () => ({
  trackEvent: trackEventMock,
}));

vi.mock("@/contexts/CartContext", () => ({
  useCart: () => ({ items: [], addItem: addItemMock }),
}));

vi.mock("@/contexts/LikesContext", () => ({
  useLikes: () => ({ toggleLike: toggleLikeMock, isLiked: () => false }),
}));

vi.mock("@/components/ReviewsModal", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div role="dialog">Reviews</div> : null),
}));

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

const restaurant = {
  id: "restaurant-1",
  name: "Dragón Dorado",
  username: "dragon-dorado",
  bio: "Sabores tradicionales",
  posts: 1,
  whatsappLink: "",
  whatsappEnabled: false,
  instagramUsername: "",
  logo: "/logo.jpg",
  menuLayout: "social",
  menuTheme: "light",
  ownerId: null,
  cuisineTemplate: "generic",
  showByRating: false,
  showRating: true,
} satisfies RestaurantInfo;

describe("DishFeed analytics boundary", () => {
  beforeEach(() => {
    trackEventMock.mockReset();
    addItemMock.mockReset();
    toggleLikeMock.mockReset();
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("does not track dish views or cart additions in preview", () => {
    render(
      <DishFeed
        dishes={[dish]}
        startIndex={0}
        restaurant={restaurant}
        onClose={vi.fn()}
        isPreview
      />,
    );

    expect(trackEventMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(addItemMock).toHaveBeenCalledWith(dish);
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  it("does not persist likes or open review submission in preview", () => {
    render(
      <DishFeed
        dishes={[dish]}
        startIndex={0}
        restaurant={restaurant}
        onClose={vi.fn()}
        isPreview
      />,
    );

    const likeButton = screen.getByRole("button", { name: "Me gusta" });
    const reviewButton = screen.getByRole("button", { name: "Ver comentarios" });

    expect(likeButton).toBeDisabled();
    expect(reviewButton).toBeDisabled();
    fireEvent.click(likeButton);
    fireEvent.click(reviewButton);

    expect(toggleLikeMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("tracks an intentionally opened dish and one selection add", () => {
    render(
      <DishFeed
        dishes={[dish]}
        startIndex={0}
        restaurant={restaurant}
        onClose={vi.fn()}
      />,
    );

    expect(trackEventMock).toHaveBeenCalledWith({
      restaurantId: "restaurant-1",
      eventType: "dish_view",
      dishId: "dish-1",
      categoryId: "category-1",
      isPreview: false,
    });

    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(trackEventMock).toHaveBeenCalledWith({
      restaurantId: "restaurant-1",
      eventType: "selection_add",
      dishId: "dish-1",
      categoryId: "category-1",
      isPreview: false,
    });
  });

  it("keeps the shared detail actions in Carta clásica without inventing a photo", () => {
    render(
      <DishFeed
        dishes={[dish]}
        startIndex={0}
        restaurant={restaurant}
        onClose={vi.fn()}
        presentation="classic"
      />,
    );

    expect(document.querySelector('[data-menu-presentation="classic"]')).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Guacamole" })).not.toBeInTheDocument();
    expect(screen.getByText("$100.00 MXN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Me gusta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver comentarios" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(addItemMock).toHaveBeenCalledWith(dish);
    expect(trackEventMock).toHaveBeenCalledWith(expect.objectContaining({ eventType: "selection_add" }));
  });

  it.each(["classic", "gallery"] as const)("tracks an intentionally opened %s detail once", (presentation) => {
    render(
      <DishFeed
        dishes={[dish]}
        startIndex={0}
        restaurant={restaurant}
        onClose={vi.fn()}
        presentation={presentation}
      />,
    );

    expect(trackEventMock).toHaveBeenCalledTimes(1);
    expect(trackEventMock).toHaveBeenCalledWith({
      restaurantId: "restaurant-1",
      eventType: "dish_view",
      dishId: "dish-1",
      categoryId: "category-1",
      isPreview: false,
    });
  });

  it("uses a neutral gallery placeholder without a real photo and shows real photos when present", () => {
    const { unmount } = render(
      <DishFeed
        dishes={[dish]}
        startIndex={0}
        restaurant={restaurant}
        onClose={vi.fn()}
        presentation="gallery"
      />,
    );

    expect(screen.getAllByText("Guacamole")).toHaveLength(2);
    expect(screen.queryByRole("img", { name: "Guacamole" })).not.toBeInTheDocument();
    unmount();

    render(
      <DishFeed
        dishes={[{ ...dish, hasRealImage: true }]}
        startIndex={0}
        restaurant={restaurant}
        onClose={vi.fn()}
        presentation="gallery"
      />,
    );
    expect(screen.getByRole("img", { name: "Guacamole" })).toHaveAttribute("src", "/dish.jpg");
  });

  it("preserves the existing Social fallback image by default", () => {
    render(<DishFeed dishes={[dish]} startIndex={0} restaurant={restaurant} onClose={vi.fn()} />);

    expect(document.querySelector('[data-menu-presentation="social"]')).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Guacamole" })).toHaveAttribute("src", "/dish.jpg");
  });

  it("keeps an unavailable dish visible but blocks adding it to Mi pedido", () => {
    const unavailableDish = { ...dish, isAvailable: false };
    render(<DishFeed dishes={[unavailableDish]} startIndex={0} restaurant={restaurant} onClose={vi.fn()} />);

    const addButton = screen.getByRole("button", { name: "Agotado" });
    expect(addButton).toBeDisabled();
    fireEvent.click(addButton);
    expect(addItemMock).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalledWith(expect.objectContaining({ eventType: "selection_add" }));
  });

  it("hides rating display without disabling dish reviews", () => {
    render(<DishFeed dishes={[{ ...dish, showRating: false }]} startIndex={0} restaurant={restaurant} onClose={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Ver y dejar reseñas" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver comentarios" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
