import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Dish } from "@/data/restaurant";
import ClassicMenu from "./ClassicMenu";

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

function renderMenu(overrides: Partial<React.ComponentProps<typeof ClassicMenu>> = {}) {
  return render(
    <ClassicMenu
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

describe("ClassicMenu", () => {
  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("shows category, dish, price, and description in readable rows", () => {
    renderMenu();

    expect(screen.getByRole("heading", { name: "Entradas" })).toBeInTheDocument();
    expect(screen.getByText("Arroz frito Yangzhou")).toBeInTheDocument();
    expect(screen.getByText("Arroz salteado con verduras y huevo.")).toBeInTheDocument();
    expect(screen.getByText("$145.00 MXN")).toBeInTheDocument();
  });

  it("does not render a fallback photo and shows a thumbnail only for a real image", () => {
    renderMenu();

    expect(screen.queryByRole("img", { name: "Arroz frito Yangzhou" })).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Sopa Wonton" })).toHaveAttribute("src", "/wonton.jpg");
  });

  it("uses the available width for text when a dish has no real photo", () => {
    renderMenu();

    const row = screen.getByTestId("menu-dish-dish-1");
    expect(row).toHaveClass("grid-cols-[minmax(0,1fr)_auto]");
  });

  it("activates a category from the text index and scrolls to its section", () => {
    const onCategoryActivate = vi.fn();
    const { rerender } = renderMenu({ onCategoryActivate });

    const index = screen.getByRole("navigation", { name: "Índice de categorías" });
    fireEvent.click(within(index).getByRole("button", { name: /Entradas/ }));

    expect(onCategoryActivate).toHaveBeenCalledWith("category-1");
    rerender(
      <ClassicMenu
        categories={categories}
        dishes={dishes}
        searchQuery=""
        activeCategory="category-1"
        showByRating={false}
        onCategoryActivate={onCategoryActivate}
        onDishOpen={vi.fn()}
      />,
    );
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("scrolls again when the already selected index item is activated", () => {
    const onCategoryActivate = vi.fn();
    renderMenu({ activeCategory: "category-1", onCategoryActivate });
    HTMLElement.prototype.scrollIntoView = vi.fn();

    fireEvent.click(within(screen.getByRole("navigation", { name: "Índice de categorías" }))
      .getByRole("button", { name: /Entradas/ }));

    expect(onCategoryActivate).toHaveBeenCalledWith("category-1");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("keeps all category sections available and filters only the virtual popular list", () => {
    const { rerender } = renderMenu({ activeCategory: "category-1" });
    expect(screen.getByRole("heading", { name: "Entradas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sopas" })).toBeInTheDocument();

    rerender(
      <ClassicMenu
        categories={categories}
        dishes={dishes}
        searchQuery=""
        activeCategory="populares"
        showByRating={false}
        onCategoryActivate={vi.fn()}
        onDishOpen={vi.fn()}
      />,
    );

    expect(screen.getByRole("heading", { name: "Populares" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Entradas" })).not.toBeInTheDocument();
  });

  it("sorts Populares by the configured rating or likes", () => {
    const { container, rerender } = renderMenu({ activeCategory: "populares", showByRating: false });
    const getOrder = () => Array.from(container.querySelectorAll<HTMLElement>("[data-dish-id]"))
      .map((element) => element.dataset.dishId);

    expect(getOrder()).toEqual(["dish-1", "dish-2"]);

    rerender(
      <ClassicMenu
        categories={categories}
        dishes={dishes}
        searchQuery=""
        activeCategory="populares"
        showByRating
        onCategoryActivate={vi.fn()}
        onDishOpen={vi.fn()}
      />,
    );

    expect(getOrder()).toEqual(["dish-2", "dish-1"]);
  });

  it("lets search find dishes outside the active category", () => {
    renderMenu({ activeCategory: "category-1", searchQuery: "Sopa" });

    expect(screen.getByText("Sopa Wonton")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sopas" })).toBeInTheDocument();
    expect(screen.queryByText("Arroz frito Yangzhou")).not.toBeInTheDocument();
  });

  it("shows clear empty states for an empty catalog and an unmatched search", () => {
    const { rerender } = renderMenu({ categories: [], dishes: [] });
    expect(screen.getByRole("status")).toHaveTextContent("Aún no hay platillos disponibles.");

    rerender(
      <ClassicMenu
        categories={categories}
        dishes={dishes}
        searchQuery="no existe"
        activeCategory={null}
        showByRating={false}
        onCategoryActivate={vi.fn()}
        onDishOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("No encontramos platillos con esa búsqueda.");
  });

  it("opens only the dish activated from a row", () => {
    const onDishOpen = vi.fn();
    renderMenu({ onDishOpen });

    fireEvent.click(screen.getByTestId("menu-dish-dish-1"));

    expect(onDishOpen).toHaveBeenCalledWith(dishes[0]);
  });
});
