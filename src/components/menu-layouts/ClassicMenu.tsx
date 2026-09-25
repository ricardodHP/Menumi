import { useEffect, useMemo, useState } from "react";
import type { Category, Dish } from "@/data/restaurant";
import { formatCurrency } from "@/lib/currency";
import { getMenuSections } from "./menu-sections";

interface ClassicMenuProps {
  categories: Category[];
  dishes: Dish[];
  searchQuery: string;
  activeCategory: string | null;
  showByRating: boolean;
  onCategoryActivate: (categoryId: string) => void;
  onDishOpen: (dish: Dish) => void;
}

const getSectionElementId = (sectionId: string) => `classic-menu-section-${sectionId}`;

export default function ClassicMenu({
  categories,
  dishes,
  searchQuery,
  activeCategory,
  showByRating,
  onCategoryActivate,
  onDishOpen,
}: ClassicMenuProps) {
  const [scrollRequest, setScrollRequest] = useState(0);
  const sections = useMemo(() => getMenuSections({
    categories,
    dishes,
    searchQuery,
    activeCategory,
    showByRating,
  }), [categories, dishes, searchQuery, activeCategory, showByRating]);

  useEffect(() => {
    if (!activeCategory || searchQuery.trim()) return;
    document.getElementById(getSectionElementId(activeCategory))?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [activeCategory, searchQuery, scrollRequest]);

  const categoryLinks = [
    { id: "populares", label: "🔥 Populares" },
    ...categories.map((category) => ({
      id: category.id,
      label: `${category.emoji} ${category.name}`,
    })),
  ];

  const activateCategory = (categoryId: string) => {
    onCategoryActivate(categoryId);
    setScrollRequest((request) => request + 1);
  };

  return (
    <div className="space-y-5 px-4 pb-28 pt-5 sm:px-6">
      <nav aria-label="Índice de categorías" className="flex gap-2 overflow-x-auto pb-1">
        {categoryLinks.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={activeCategory === category.id}
            onClick={() => activateCategory(category.id)}
            className={`shrink-0 rounded-full border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              activeCategory === category.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-muted"
            }`}
          >
            {category.label}
          </button>
        ))}
      </nav>

      {sections.length === 0 ? (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">
          {searchQuery.trim()
            ? "No encontramos platillos con esa búsqueda."
            : "Aún no hay platillos disponibles."}
        </p>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={getSectionElementId(section.id)}
              aria-labelledby={`classic-menu-heading-${section.id}`}
              className="scroll-mt-24"
            >
              <h2 id={`classic-menu-heading-${section.id}`} className="mb-2 border-b border-border pb-2">
                <button
                  type="button"
                  aria-pressed={activeCategory === section.id}
                  onClick={() => activateCategory(section.id)}
                  className="rounded-sm text-left text-lg font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden="true">{section.emoji}</span>{" "}
                  <span>{section.name}</span>
                </button>
              </h2>

              {section.dishes.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Todavía no hay platillos en esta categoría.</p>
              ) : (
                <div>
                  {section.dishes.map((dish) => {
                    const hasImage = dish.hasRealImage === true;
                    return (
                      <button
                        key={dish.id}
                        type="button"
                        data-testid={`menu-dish-${dish.id}`}
                        data-dish-id={dish.id}
                        onClick={() => onDishOpen(dish)}
                        className={`grid w-full items-center gap-3 border-b border-border/80 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          hasImage
                            ? "grid-cols-[3.5rem_minmax(0,1fr)_auto]"
                            : "grid-cols-[minmax(0,1fr)_auto]"
                        }`}
                      >
                        {hasImage && (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            loading="lazy"
                            width={56}
                            height={56}
                            className="h-14 w-14 rounded-md object-cover"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block font-semibold text-foreground">{dish.name}</span>
                          {dish.description && (
                            <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-muted-foreground">
                              {dish.description}
                            </span>
                          )}
                          {dish.isAvailable === false && (
                            <span className="mt-1 block text-xs font-medium text-destructive">Agotado</span>
                          )}
                        </span>
                        <span className="whitespace-nowrap pl-2 text-sm font-semibold text-primary">
                          {formatCurrency(dish.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
