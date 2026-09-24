export interface PublicCategoryRecord {
  id: string;
  is_visible?: boolean | null;
}

export interface PublicDishRecord {
  id: string;
  category_id: string | null;
  is_active?: boolean | null;
}

export function getRestaurantPublicPath(slug: string): string {
  return `/r/${slug}`;
}

export function getRestaurantPublicUrl(slug: string, origin: string): string {
  return `${origin.replace(/\/+$/, "")}${getRestaurantPublicPath(slug)}`;
}

export function filterPublicMenuRecords<
  Category extends PublicCategoryRecord,
  Dish extends PublicDishRecord,
>(categories: Category[], dishes: Dish[]): { categories: Category[]; dishes: Dish[] } {
  const visibleCategories = categories.filter((category) => category.is_visible !== false);
  const visibleCategoryIds = new Set(visibleCategories.map((category) => category.id));
  const visibleDishes = dishes.filter(
    (dish) =>
      dish.is_active !== false &&
      (dish.category_id === null || visibleCategoryIds.has(dish.category_id)),
  );

  return { categories: visibleCategories, dishes: visibleDishes };
}
