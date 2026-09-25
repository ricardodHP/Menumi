import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import type { Category } from "@/data/restaurant";

interface CategoryStoriesProps {
  categories: Category[];
  activeCategory: string | null;
  onCategoryClick: (categoryId: string) => void;
}

const CategoryStories = ({ categories, activeCategory, onCategoryClick }: CategoryStoriesProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const [atStart, setAtStart] = useState(true);

  // virtual "populares" pseudo-category lives outside DB
  const all = [
    { id: "populares", name: "Populares", emoji: "🔥", image: categories[0]?.image ?? "" },
    ...categories,
  ];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const overflow = el.scrollWidth > el.clientWidth + 4;
      setHasOverflow(overflow);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
      setAtStart(el.scrollLeft <= 4);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories.length]);

  if (categories.length === 0) return null;

  const showHintRight = hasOverflow && !atEnd;
  const showHintLeft = hasOverflow && !atStart;

  const scrollByStory = (direction: -1 | 1) => {
    const element = scrollRef.current;
    if (!element) return;

    const firstStory = element.querySelector<HTMLElement>("button");
    const gap = Number.parseFloat(window.getComputedStyle(element).columnGap) || 0;
    const step = (firstStory?.offsetWidth ?? 80) + gap;
    element.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  return (
    <div className="px-2 py-3 border-b border-border relative">
      <div
        ref={scrollRef}
        className={`flex gap-4 overflow-x-auto scrollbar-hide px-2 scroll-smooth ${
          hasOverflow ? "lg:justify-start" : "lg:justify-center"
        }`}
      >
        {all.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryClick(cat.id)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div
              className={`rounded-full transition-all ${
                activeCategory === cat.id ? "story-ring-active" : "bg-border p-[3px]"
              }`}
            >
              <div className="rounded-full overflow-hidden bg-background p-[2px]">
                <img
                  src={cat.image}
                  alt={cat.name}
                  width={64}
                  height={64}
                  loading="lazy"
                  className="rounded-full w-16 h-16 object-cover"
                />
              </div>
            </div>
            <span className="min-h-7 w-20 whitespace-normal break-words text-center text-[11px] leading-tight text-foreground">
              {cat.emoji} {cat.name}
            </span>
          </button>
        ))}
      </div>

      {/* Right scroll control */}
      {showHintRight && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background via-background/80 to-transparent"
          />
          <button
            type="button"
            aria-label="Desplazar categorías a la derecha"
            onClick={() => scrollByStory(1)}
            className="absolute right-0.5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="rounded-full bg-foreground/80 p-1.5 text-background shadow-md">
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          </button>
        </>
      )}

      {/* Left scroll control */}
      {showHintLeft && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background via-background/80 to-transparent"
          />
          <button
            type="button"
            aria-label="Desplazar categorías a la izquierda"
            onClick={() => scrollByStory(-1)}
            className="absolute left-0.5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="rounded-full bg-foreground/80 p-1.5 text-background shadow-md">
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          </button>
        </>
      )}
    </div>
  );
};

export default CategoryStories;
