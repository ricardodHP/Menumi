import { useEffect, useMemo, useState } from "react";
import type { Category, Dish } from "@/data/restaurant";
import { formatCurrency } from "@/lib/currency";
import { getMenuSections } from "./menu-sections";

interface GalleryMenuProps {
  categories: Category[];
  dishes: Dish[];
  searchQuery: string;
  activeCategory: string | null;
  showByRating: boolean;
  onCategoryActivate: (categoryId: string) => void;
  onDishOpen: (dish: Dish) => void;
}

const getSectionElementId = (sectionId: string) => `gallery-menu-section-${sectionId}`;

export default function GalleryMenu({
  categories,
  dishes,
  searchQuery,
  activeCategory,
  showByRating,
  onCategoryActivate,
  onDishOpen,
}: GalleryMenuProps) {
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
    <div className="space-y-6 px-4 pb-28 pt-5 sm:px-6">
      <nav aria-label="Categorías de la galería" className="flex gap-2 overflow-x-auto pb-1">
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
        <p role="status" className="py-16 text-center text-sm text-muted-foreground">
          {searchQuery.trim()
            ? "No hay platillos para mostrar con esta búsqueda."
            : "Aún no hay platillos disponibles."}
        </p>
      ) : (
        <div className="space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={getSectionElementId(section.id)}
              aria-labelledby={`gallery-menu-heading-${section.id}`}
              className="scroll-mt-24"
            >
              <div className="mb-4 flex items-center gap-3">
                {section.category?.hasRealImage === true && (
                  <img
                    src={section.category.image}
                    alt={`Categoría ${section.category.name}`}
                    loading="lazy"
                    width={48}
                    height={48}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <h2 id={`gallery-menu-heading-${section.id}`} className="text-xl font-semibold text-foreground">
                  <button
                    type="button"
                    aria-pressed={activeCategory === section.id}
                    onClick={() => activateCategory(section.id)}
                    className="rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span aria-hidden="true">{section.emoji}</span>{" "}
                    <span>{section.name}</span>
                  </button>
                </h2>
              </div>

              {section.dishes.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">Todavía no hay platillos en esta categoría.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {section.dishes.map((dish) => {
                    const hasImage = dish.hasRealImage === true;
                    return (
                      <button
                        key={dish.id}
                        type="button"
                        data-testid={`gallery-dish-${dish.id}`}
                        data-dish-id={dish.id}
                        data-image-state={hasImage ? "photo" : "typographic"}
                        onClick={() => onDishOpen(dish)}
                        className="overflow-hidden rounded-xl border border-border bg-card text-left shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {hasImage ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            loading="lazy"
                            width={720}
                            height={540}
                            className="aspect-[4/3] w-full object-cover"
                          />
                        ) : (
                          <span className="flex aspect-[4/3] items-center justify-center bg-secondary/50 px-6 text-center font-serif text-xl font-semibold text-secondary-foreground">
                            {dish.name}
                          </span>
                        )}
                        <span className="flex flex-col items-start gap-2 p-4">
                          <span className="min-w-0">
                            {hasImage && <span className="block font-semibold text-foreground">{dish.name}</span>}
                            {dish.isAvailable === false && (
                              <span className="mt-1 block text-xs font-medium text-destructive">Agotado</span>
                            )}
                          </span>
                          <span className="whitespace-nowrap text-sm font-semibold text-primary">
                            {formatCurrency(dish.price)}
                          </span>
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
