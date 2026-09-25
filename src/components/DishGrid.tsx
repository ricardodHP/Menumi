import { useEffect, useMemo, useRef, useState } from "react";
import { type Dish } from "@/data/restaurant";

interface DishGridProps {
  dishes: Dish[];
  onDishClick: (dishIndex: number) => void;
  /** Reset pagination when this key changes (e.g. category/search changes). */
  resetKey?: string;
}

const PAGE_SIZE = 9;

const DishGrid = ({ dishes, onDishClick, resetKey }: DishGridProps) => {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset whenever filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [resetKey]);

  const visibleDishes = useMemo(() => dishes.slice(0, visibleCount), [dishes, visibleCount]);
  const hasMore = visibleCount < dishes.length;

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, dishes.length));
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, dishes.length]);

  if (dishes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No hay platillos en esta categoría</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-[2px] animate-fade-in">
        {visibleDishes.map((dish, index) => (
          <button
            key={dish.id}
            onClick={() => onDishClick(index)}
            className="relative aspect-square overflow-hidden group"
          >
            <img
              src={dish.image}
              alt={dish.name}
              loading="lazy"
              width={512}
              height={512}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {dish.isAvailable === false && (
              <div className="absolute inset-0 flex items-end justify-center bg-foreground/45 p-2">
                <span className="rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground">Agotado</span>
              </div>
            )}
            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="flex items-center gap-3 text-primary-foreground text-sm font-semibold">
                <span>❤️ {dish.likes}</span>
              </div>
            </div>
            {dish.tags.includes("Best Seller") && (
              <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                🔥
              </div>
            )}
          </button>
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-muted-foreground">
          Cargando más...
        </div>
      )}
    </>
  );
};

export default DishGrid;
