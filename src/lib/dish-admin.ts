import type { Dish } from "@/data/restaurant";

export const SUPPORTED_DISH_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isSupportedDishImage(file: Pick<File, "type">): boolean {
  return SUPPORTED_DISH_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_DISH_IMAGE_TYPES)[number]);
}

export function getDishImageExtension(type: string): string | null {
  const extensions: Record<(typeof SUPPORTED_DISH_IMAGE_TYPES)[number], string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  return extensions[type as keyof typeof extensions] ?? null;
}

export function normalizeDishTags(value: string): string[] {
  return [...new Set(value.split(",").map((tag) => tag.trim()).filter(Boolean))];
}

export function validateDishPrice(value: string, existingPrice?: number): number | null {
  if (value.trim() === "" && existingPrice !== undefined) return existingPrice;
  const price = Number(value);
  if (existingPrice !== undefined && Number.isFinite(price) && price === existingPrice) return existingPrice;
  if (!Number.isFinite(price) || price <= 0) return null;
  return Math.round(price * 100) / 100;
}

export function filterAdminDishes<T extends Pick<Dish, "name" | "description" | "tags" | "category">>(
  dishes: readonly T[],
  query: string,
  category: string,
): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return dishes.filter((dish) => {
    const categoryMatches = category === "all"
      || (category === "uncategorized" ? !dish.category : dish.category === category);
    const queryMatches = !normalizedQuery || [dish.name, dish.description, ...dish.tags]
      .some((field) => field.toLocaleLowerCase().includes(normalizedQuery));
    return categoryMatches && queryMatches;
  });
}
