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
  instagramLink: "",
  logo: "/logo.jpg",
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

  it("keeps tracking normal public dish views and cart additions", () => {
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
      eventType: "view",
      dishId: "dish-1",
    });

    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(trackEventMock).toHaveBeenCalledWith({
      restaurantId: "restaurant-1",
      eventType: "cart_add",
      dishId: "dish-1",
    });
  });
});
