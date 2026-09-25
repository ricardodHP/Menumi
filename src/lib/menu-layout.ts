import type { RestaurantInfo } from "@/data/restaurant";

export type MenuLayout = "social" | "classic" | "gallery";
export type CuisineTemplate = RestaurantInfo["cuisineTemplate"];

const CUISINE_TEMPLATE_VALUES: readonly CuisineTemplate[] = [
  "generic",
  "mexican",
  "italian",
  "chinese",
  "japanese",
];

export const MENU_LAYOUTS: ReadonlyArray<{
  value: MenuLayout;
  label: string;
  description: string;
}> = [
  {
    value: "social",
    label: "Social",
    description: "Tu menú visual con categorías tipo stories.",
  },
  {
    value: "classic",
    label: "Carta clásica",
    description: "Lectura rápida con precios siempre visibles.",
  },
  {
    value: "gallery",
    label: "Galería",
    description: "Un recorrido visual para destacar tus platillos.",
  },
];

export function normalizeMenuLayout(value: unknown): MenuLayout {
  if (value === "classic" || value === "gallery" || value === "social") return value;
  return "social";
}

export function isCuisineTemplate(value: unknown): value is CuisineTemplate {
  return CUISINE_TEMPLATE_VALUES.some((template) => template === value);
}

export function buildMenuPreviewPath(
  publicPath: string,
  layout: MenuLayout,
  theme: CuisineTemplate,
): string {
  const hashPosition = publicPath.indexOf("#");
  const pathAndSearch = hashPosition >= 0 ? publicPath.slice(0, hashPosition) : publicPath;
  const hash = hashPosition >= 0 ? publicPath.slice(hashPosition) : "";
  const queryPosition = pathAndSearch.indexOf("?");
  const pathname = queryPosition >= 0 ? pathAndSearch.slice(0, queryPosition) : pathAndSearch;
  const query = queryPosition >= 0 ? pathAndSearch.slice(queryPosition + 1) : "";
  const searchParams = new URLSearchParams(query);

  searchParams.set("preview", "1");
  searchParams.set("menu_layout", layout);
  searchParams.set("cuisine_template", theme);

  return `${pathname}?${searchParams.toString()}${hash}`;
}
