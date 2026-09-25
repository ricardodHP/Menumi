import { useState, useMemo, useCallback, useEffect, useLayoutEffect, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { useCart, getStoredName } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Grid3X3, Star, Search, X, MessageSquare } from "lucide-react";
import ProfileHeader from "@/components/ProfileHeader";
import CategoryStories from "@/components/CategoryStories";
import DishGrid from "@/components/DishGrid";
import DishFeed from "@/components/DishFeed";
import ClassicMenu from "@/components/menu-layouts/ClassicMenu";
import GalleryMenu from "@/components/menu-layouts/GalleryMenu";
import CartFloatingButton from "@/components/CartFloatingButton";
import CartModal from "@/components/CartModal";
import AssistantFloatingButton from "@/components/AssistantFloatingButton";
import AssistantModal from "@/components/AssistantModal";
import ReviewsModal from "@/components/ReviewsModal";
import type { Category, Dish, RestaurantInfo } from "@/data/restaurant";
import { getTemplateStyles } from "@/lib/templates";
import { trackEvent } from "@/lib/analytics";

interface RestaurantViewProps {
  restaurant: RestaurantInfo;
  categories: Category[];
  dishes: Dish[];
  isPreview?: boolean;
}

const RestaurantView = ({ restaurant, categories, dishes, isPreview = false }: RestaurantViewProps) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(() => (
    restaurant.menuLayout === "social" ? "populares" : null
  ));
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState(0);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "ranked">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [restaurantReviewsOpen, setRestaurantReviewsOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const { setRestaurantScope, joinSharedCart, shared } = useCart();

  useEffect(() => {
    setActiveCategory(restaurant.menuLayout === "social" ? "populares" : null);
  }, [restaurant.menuLayout]);

  // Register a resolver so the shared cart can map dish_id → Dish.
  useLayoutEffect(() => {
    setRestaurantScope(restaurant.id, dishes, { persist: !isPreview });
  }, [dishes, isPreview, restaurant.id, setRestaurantScope]);

  // Handle ?group=<code> deep link: join the shared cart.
  useEffect(() => {
    const code = searchParams.get("group");
    if (isPreview) {
      if (code) {
        const next = new URLSearchParams(searchParams);
        next.delete("group");
        setSearchParams(next, { replace: true });
      }
      return;
    }
    if (!code || shared) return;
    const stored = getStoredName();
    const name = stored ?? window.prompt("Tu nombre para el carrito compartido:", "")?.trim() ?? "";
    if (!name) {
      toast.error("Necesitas un nombre para unirte al carrito");
      const next = new URLSearchParams(searchParams);
      next.delete("group");
      setSearchParams(next, { replace: true });
      return;
    }
    joinSharedCart(code, name).then((ok) => {
      if (ok) toast.success("Te uniste al carrito compartido");
      else toast.error("Carrito no encontrado o expirado");
      const next = new URLSearchParams(searchParams);
      next.delete("group");
      setSearchParams(next, { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreview, searchParams.get("group")]);


  const tpl = getTemplateStyles(restaurant.cuisineTemplate);
  const rootStyle: CSSProperties = {
    ...(tpl.vars as CSSProperties),
    fontFamily: tpl.fontFamily,
  };

  const filteredDishes = useMemo(() => {
    let result = dishes;
    if (searchQuery.trim()) {
      // Search ignores category filter and looks in ALL dishes of the restaurant
      const q = searchQuery.toLowerCase();
      result = result.filter((d) => d.name.toLowerCase().includes(q));
    } else if (activeCategory === "populares") {
      result = [...result].sort((a, b) =>
        restaurant.showByRating ? b.rating - a.rating : b.likes - a.likes,
      );
    } else if (activeCategory) {
      result = result.filter((d) => d.category === activeCategory);
    }
    return result;
  }, [activeCategory, searchQuery, dishes, restaurant.showByRating]);

  // Handle ?dish=<id> deep link only when the dish belongs to this menu.
  useEffect(() => {
    const dishId = searchParams.get("dish");
    if (!dishId || dishes.length === 0) return;

    const dish = dishes.find((item) => item.id === dishId);
    if (dish) {
      if (restaurant.menuLayout === "social") {
        const index = filteredDishes.findIndex((item) => item.id === dishId);
        if (index >= 0) {
          setSelectedDish(null);
          setFeedStartIndex(index);
          setFeedOpen(true);
        }
      } else {
        setSelectedDish(dish);
        setFeedStartIndex(0);
        setFeedOpen(true);
      }
    }

    const next = new URLSearchParams(searchParams);
    next.delete("dish");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dishes, restaurant.menuLayout]);

  const handleDishClick = (index: number) => {
    setSelectedDish(null);
    setFeedStartIndex(index);
    setFeedOpen(true);
  };

  const handleLayoutDishOpen = (dish: Dish) => {
    setSelectedDish(dish);
    setFeedStartIndex(0);
    setFeedOpen(true);
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(restaurant.menuLayout === "social" && activeCategory === categoryId ? null : categoryId);
    const isPersistentCategory = categories.some((category) => category.id === categoryId);
    if (!isPreview && isPersistentCategory && activeCategory !== categoryId) {
      trackEvent({
        restaurantId: restaurant.id,
        eventType: "category_view",
        categoryId,
        isPreview,
      });
    }
  };

  const avgRating = restaurant.showRating && dishes.length > 0
    ? (dishes.reduce((sum, dish) => sum + dish.rating, 0) / dishes.length).toFixed(1)
    : null;

  const activeCategoryName = useMemo(() => {
    if (searchQuery.trim()) return `Resultados: "${searchQuery.trim()}"`;
    if (!activeCategory) return null;
    if (activeCategory === "populares") return "Populares";
    return categories.find((c) => c.id === activeCategory)?.name ?? null;
  }, [activeCategory, categories, searchQuery]);

  const handleReviewSubmitted = useCallback(() => {
    setRefreshTick((t) => t + 1);
  }, []);

  return (
    <div className="mx-auto min-h-screen max-w-6xl bg-background" style={rootStyle} data-menu-layout={restaurant.menuLayout}>
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background border-b border-border px-4 py-2.5 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">
          {tpl.emoji} {restaurant.username}
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSearchOpen(!searchOpen);
              setSearchQuery("");
            }}
            className="text-foreground"
            aria-label="Buscar"
          >
            <Search className="w-5 h-5" />
          </button>
          {!isPreview && (
            <button
              onClick={() => setRestaurantReviewsOpen(true)}
              className="flex items-center gap-1 text-accent hover:opacity-80 transition-opacity"
              aria-label="Ver reseñas del restaurante"
            >
              {restaurant.showRating && avgRating ? (
                <>
                  <Star className="w-4 h-4 fill-accent" />
                  <span className="text-sm font-semibold text-foreground">{avgRating}</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-sm font-semibold text-foreground">Reseñas</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {searchOpen && (
        <div className="sticky top-[45px] z-20 bg-background border-b border-border px-4 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en todos los platillos..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <ProfileHeader
        restaurant={restaurant}
        variant={restaurant.menuLayout === "classic" ? "classic" : "social"}
      />

      {restaurant.menuLayout === "social" ? (
        <>
          <CategoryStories
            categories={categories}
            activeCategory={activeCategory}
            onCategoryClick={handleCategoryClick}
          />

          {/* Tab bar */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex-1 py-2.5 flex justify-center border-b-2 transition-colors ${
                viewMode === "grid"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("ranked")}
              className={`flex-1 py-2.5 flex justify-center border-b-2 transition-colors ${
                viewMode === "ranked"
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <Star className="w-5 h-5" />
            </button>
          </div>

          {viewMode === "grid" ? (
            <DishGrid
              dishes={filteredDishes}
              onDishClick={handleDishClick}
              resetKey={`${activeCategory ?? "none"}|${searchQuery}|${viewMode}`}
            />
          ) : (
            <DishGrid
              dishes={[...filteredDishes].sort((a, b) => b.rating - a.rating)}
              onDishClick={handleDishClick}
              resetKey={`${activeCategory ?? "none"}|${searchQuery}|${viewMode}`}
            />
          )}
        </>
      ) : restaurant.menuLayout === "classic" ? (
        <ClassicMenu
          categories={categories}
          dishes={dishes}
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          showByRating={restaurant.showByRating}
          onCategoryActivate={handleCategoryClick}
          onDishOpen={handleLayoutDishOpen}
        />
      ) : (
        <GalleryMenu
          categories={categories}
          dishes={dishes}
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          showByRating={restaurant.showByRating}
          onCategoryActivate={handleCategoryClick}
          onDishOpen={handleLayoutDishOpen}
        />
      )}

      {feedOpen && (
        <DishFeed
          dishes={restaurant.menuLayout === "social" ? filteredDishes : selectedDish ? [selectedDish] : []}
          startIndex={feedStartIndex}
          restaurant={restaurant}
          headerTitle={restaurant.menuLayout === "social" ? activeCategoryName ?? restaurant.username : selectedDish?.name ?? restaurant.username}
          onClose={() => setFeedOpen(false)}
          onReviewSubmitted={handleReviewSubmitted}
          isPreview={isPreview}
          presentation={restaurant.menuLayout}
        />
      )}
      <AssistantFloatingButton onClick={() => setAssistantOpen(true)} used={assistantOpen} />
      <AssistantModal open={assistantOpen} onClose={() => setAssistantOpen(false)} dishes={dishes} />
      <CartFloatingButton />
      <CartModal isPreview={isPreview} />
      {!isPreview && (
        <ReviewsModal
          open={restaurantReviewsOpen}
          onClose={() => setRestaurantReviewsOpen(false)}
          title={`Reseñas de ${restaurant.name}`}
          restaurantId={restaurant.id}
          allowRestaurantSubmission={restaurant.allowReviews !== false}
          onSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default RestaurantView;
