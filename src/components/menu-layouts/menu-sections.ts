import type { Category, Dish } from "@/data/restaurant";

export interface MenuSection {
  id: string;
  name: string;
  emoji: string;
  category: Category | null;
  dishes: Dish[];
}

interface GetMenuSectionsOptions {
  categories: Category[];
  dishes: Dish[];
  searchQuery: string;
  activeCategory: string | null;
  showByRating: boolean;
}

export function getMenuSections({
  categories,
  dishes,
  searchQuery,
  activeCategory,
  showByRating,
}: GetMenuSectionsOptions): MenuSection[] {
  const query = searchQuery.trim().toLocaleLowerCase("es-MX");
  const matchingDishes = query
    ? dishes.filter((dish) => dish.name.toLocaleLowerCase("es-MX").includes(query))
    : dishes;

  if (!query && activeCategory === "populares") {
    const popularDishes = [...matchingDishes].sort((first, second) => (
      showByRating ? second.rating - first.rating : second.likes - first.likes
    ));
    return popularDishes.length > 0
      ? [{ id: "populares", name: "Populares", emoji: "🔥", category: null, dishes: popularDishes }]
      : [];
  }

  // Category controls are an index for these layouts. Only the virtual
  // Populares entry narrows the catalog; selecting a real category scrolls to
  // that section while keeping the rest of the menu available.
  const categoryFilter = !query && activeCategory === "populares" ? "populares" : null;
  const visibleCategoryIds = new Set(categories.map((category) => category.id));
  const sections = categories
    .filter((category) => categoryFilter === null || categoryFilter === category.id)
    .map((category) => ({
      id: category.id,
      name: category.name,
      emoji: category.emoji,
      category,
      dishes: matchingDishes.filter((dish) => dish.category === category.id),
    }))
    .filter((section) => !query || section.dishes.length > 0);

  const otherDishes = matchingDishes.filter((dish) => !visibleCategoryIds.has(dish.category));
  if ((categoryFilter === null || categoryFilter === "sin-categoria") && otherDishes.length > 0) {
    sections.push({
      id: "sin-categoria",
      name: categories.length > 0 ? "Otros platillos" : "Platillos",
      emoji: "🍽️",
      category: null,
      dishes: otherDishes,
    });
  }

  return sections;
}
