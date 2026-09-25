import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Dish } from "@/data/restaurant";
import GalleryMenu from "./GalleryMenu";

const categories = [
  { id: "category-1", name: "Entradas", image: "/category.jpg", emoji: "🥑", hasRealImage: false },
  { id: "category-2", name: "Sopas", image: "/soup.jpg", emoji: "🥣", hasRealImage: true },
] satisfies Category[];

const dishes = [
  {
    id: "dish-1",
    name: "Arroz frito Yangzhou",
    description: "Arroz salteado con verduras y huevo.",
    price: 145,
    image: "/fallback.jpg",
    hasRealImage: false,
    category: "category-1",
    rating: 4.2,
    likes: 3,
    tags: [],
    showRating: true,
  },
  {
    id: "dish-2",
    name: "Sopa Wonton",
    description: "Caldo suave con wonton.",
    price: 120,
    image: "/wonton.jpg",
    hasRealImage: true,
    category: "category-2",
    rating: 4.8,
    likes: 1,
    tags: [],
    showRating: true,
  },
] satisfies Dish[];

function renderMenu(overrides: Partial<React.ComponentProps<typeof GalleryMenu>> = {}) {
  return render(
    <GalleryMenu
      categories={categories}
      dishes={dishes}
      searchQuery=""
      activeCategory={null}
      showByRating={false}
      onCategoryActivate={vi.fn()}
      onDishOpen={vi.fn()}
      {...overrides}
    />,
  );
}

describe("GalleryMenu", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("shows every category section with dish name and price visible", () => {
    renderMenu();

    expect(screen.getByRole("heading", { name: "Entradas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sopas" })).toBeInTheDocument();
    expect(screen.getByText("Arroz frito Yangzhou")).toBeInTheDocument();
    expect(screen.getByText("$145.00 MXN")).toBeInTheDocument();
    expect(screen.getByText("Sopa Wonton")).toBeInTheDocument();
    expect(screen.getByText("$120.00 MXN")).toBeInTheDocument();
  });

  it("uses category and dish photos only when they are real", () => {
    renderMenu();

    expect(screen.queryByRole("img", { name: "Arroz frito Yangzhou" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sopa Wonton" })).toHaveAttribute("src", "/wonton.jpg");
    expect(screen.getAllByRole("img").some((image) => image.getAttribute("src") === "/soup.jpg")).toBe(true);
    expect(screen.getAllByRole("img").some((image) => image.getAttribute("src") === "/category.jpg")).toBe(false);
  });

  it("uses a text-led card when there is no dish photo", () => {
    renderMenu();

    const card = screen.getByTestId("gallery-dish-dish-1");
    expect(card).toHaveAttribute("data-image-state", "typographic");
    expect(within(card).getAllByText("Arroz frito Yangzhou")).toHaveLength(1);
    expect(card).toHaveTextContent("$145.00 MXN");
  });

  it("activates a category from its navigation and scrolls to the section", () => {
    const onCategoryActivate = vi.fn();
    const { rerender } = renderMenu({ onCategoryActivate });

    const navigation = screen.getByRole("navigation", { name: "Categorías de la galería" });
    fireEvent.click(within(navigation).getByRole("button", { name: /Sopas/ }));

    expect(onCategoryActivate).toHaveBeenCalledWith("category-2");
    rerender(
      <GalleryMenu
        categories={categories}
        dishes={dishes}
        searchQuery=""
        activeCategory="category-2"
        showByRating={false}
        onCategoryActivate={onCategoryActivate}
        onDishOpen={vi.fn()}
      />,
    );
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("scrolls again when the already selected category chip is activated", () => {
    const onCategoryActivate = vi.fn();
    renderMenu({ activeCategory: "category-2", onCategoryActivate });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    fireEvent.click(within(screen.getByRole("navigation", { name: "Categorías de la galería" }))
      .getByRole("button", { name: /Sopas/ }));

    expect(onCategoryActivate).toHaveBeenCalledWith("category-2");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("keeps all category sections available and filters only the virtual popular list", () => {
    const { rerender } = renderMenu({ activeCategory: "category-1" });
    expect(screen.getByRole("heading", { name: "Entradas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sopas" })).toBeInTheDocument();

    rerender(
      <GalleryMenu
        categories={categories}
        dishes={dishes}
        searchQuery=""
        activeCategory="populares"
        showByRating
        onCategoryActivate={vi.fn()}
        onDishOpen={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Populares" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Entradas" })).not.toBeInTheDocument();
    expect(Array.from(document.querySelectorAll<HTMLElement>("[data-dish-id]")).map((element) => element.dataset.dishId))
      .toEqual(["dish-2", "dish-1"]);
  });

  it("searches across all categories even when one is active", () => {
    renderMenu({ activeCategory: "category-1", searchQuery: "Sopa" });

    expect(screen.getByText("Sopa Wonton")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sopas" })).toBeInTheDocument();
    expect(screen.queryByText("Arroz frito Yangzhou")).not.toBeInTheDocument();
  });

  it("shows clear empty states for an empty catalog and an unmatched search", () => {
    const { rerender } = renderMenu({ categories: [], dishes: [] });
    expect(screen.getByRole("status")).toHaveTextContent("Aún no hay platillos disponibles.");

    rerender(
      <GalleryMenu
        categories={categories}
        dishes={dishes}
        searchQuery="no existe"
        activeCategory={null}
        showByRating={false}
        onCategoryActivate={vi.fn()}
        onDishOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("No hay platillos para mostrar con esta búsqueda.");
  });

  it("opens the selected dish from a gallery card", () => {
    const onDishOpen = vi.fn();
    renderMenu({ onDishOpen });

    fireEvent.click(screen.getByTestId("gallery-dish-dish-2"));

    expect(onDishOpen).toHaveBeenCalledWith(dishes[1]);
  });
});
