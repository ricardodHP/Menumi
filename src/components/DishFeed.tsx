import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, Star, Plus, Check, X, MessageCircle, Share2 } from "lucide-react";
import type { Dish, RestaurantInfo } from "@/data/restaurant";
import { useCart } from "@/contexts/CartContext";
import { useLikes } from "@/contexts/LikesContext";
import { trackEvent } from "@/lib/analytics";
import ReviewsModal from "@/components/ReviewsModal";
import { toast } from "sonner";

interface DishFeedProps {
  dishes: Dish[];
  startIndex: number;
  restaurant: RestaurantInfo;
  /** What to show in the top header (defaults to restaurant slug). */
  headerTitle?: string;
  onClose: () => void;
  onReviewSubmitted?: () => void;
  isPreview?: boolean;
}

const DishFeed = ({
  dishes,
  startIndex,
  restaurant,
  headerTitle,
  onClose,
  onReviewSubmitted,
  isPreview = false,
}: DishFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem, items } = useCart();
  const { toggleLike, isLiked } = useLikes();
  const [heartAnimation, setHeartAnimation] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);
  const lastTapRef = useRef<Record<string, number>>({});
  const trackedRef = useRef<Set<string>>(new Set());
  const [reviewsForDish, setReviewsForDish] = useState<Dish | null>(null);

  const singleTapTimerRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  const handleImageTap = useCallback((dish: Dish) => {
    const now = Date.now();
    const last = lastTapRef.current[dish.id] || 0;
    if (now - last < 300) {
      // Double tap → like
      if (!isPreview && !isLiked(dish.id)) toggleLike(dish.id);
      setHeartAnimation(dish.id);
      setTimeout(() => setHeartAnimation(null), 800);
      lastTapRef.current[dish.id] = 0;
      const t = singleTapTimerRef.current[dish.id];
      if (t) {
        clearTimeout(t);
        singleTapTimerRef.current[dish.id] = null;
      }
    } else {
      lastTapRef.current[dish.id] = now;
      // Delay single-tap action so double-tap can cancel it
      singleTapTimerRef.current[dish.id] = setTimeout(() => {
        setLightboxImage({ src: dish.image, alt: dish.name });
        singleTapTimerRef.current[dish.id] = null;
      }, 280);
    }
  }, [isLiked, isPreview, toggleLike]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.children[startIndex] as HTMLElement;
      if (el) el.scrollIntoView({ behavior: "instant" });
    }
  }, [startIndex]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    // Push a history entry so the browser back button closes the feed
    // instead of navigating away from the menu.
    window.history.pushState({ dishFeed: true }, "");
    const handlePop = () => onClose();
    window.addEventListener("popstate", handlePop);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("popstate", handlePop);
      // If we're closing without popstate (user clicked button), pop our entry
      if (window.history.state?.dishFeed) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the dish explicitly opened in the feed; card rendering alone is not a view.
  useEffect(() => {
    const dish = dishes[startIndex];
    if (!isPreview && dish && !trackedRef.current.has(dish.id)) {
      trackedRef.current.add(dish.id);
      trackEvent({
        restaurantId: restaurant.id,
        eventType: "dish_view",
        dishId: dish.id,
        categoryId: dish.category || undefined,
        isPreview,
      });
    }
  }, [startIndex, dishes, restaurant.id, isPreview]);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <img src={restaurant.logo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">
            {headerTitle ?? restaurant.username}
          </span>
        </div>
        <button onClick={onClose} className="flex items-center gap-1 text-sm font-medium text-primary hover:opacity-80 transition-opacity shrink-0">
          ← Volver al menú
        </button>
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} className="h-[calc(100vh-57px)] overflow-y-auto lg:px-6 lg:py-6">
        <div className="lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-3 lg:gap-6">
        {dishes.map((dish) => (
          <div key={dish.id} className="border-b border-border animate-fade-in lg:overflow-hidden lg:rounded-xl lg:border">
            {/* Dish image */}
            <div
              className="aspect-square w-full relative select-none"
              onClick={() => handleImageTap(dish)}
            >
              <img
                src={dish.image}
                alt={dish.name}
                loading="lazy"
                width={512}
                height={512}
                className="w-full h-full object-cover"
              />
              {heartAnimation === dish.id && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Heart className="w-20 h-20 text-white fill-white drop-shadow-lg animate-heart-pop" />
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (!isPreview) toggleLike(dish.id);
                  }}
                  disabled={isPreview}
                  className="active:scale-125 transition-transform"
                  aria-label="Me gusta"
                >
                  <Heart className={`w-6 h-6 transition-colors ${isLiked(dish.id) ? "text-red-500 fill-red-500" : "text-foreground"}`} />
                </button>
                <button
                  onClick={() => {
                    if (!isPreview) setReviewsForDish(dish);
                  }}
                  disabled={isPreview}
                  className="relative active:scale-125 transition-transform"
                  aria-label="Ver comentarios"
                >
                  <MessageCircle className="w-6 h-6 text-foreground" />
                  {(dish.reviewsCount ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
                      {dish.reviewsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (dish.isAvailable === false) return;
                    addItem(dish);
                    if (!isPreview) {
                      trackEvent({
                        restaurantId: restaurant.id,
                        eventType: "selection_add",
                        dishId: dish.id,
                        categoryId: dish.category || undefined,
                        isPreview,
                      });
                    }
                  }}
                  disabled={dish.isAvailable === false}
                  aria-label={dish.isAvailable === false ? "Agotado" : undefined}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity active:scale-95"
                >
                  {dish.isAvailable === false ? (
                    "Agotado"
                  ) : items.some((i) => i.dish.id === dish.id) ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Agregar más
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </>
                  )}
                </button>
                <button
                  onClick={async () => {
                    const url = `${window.location.origin}/r/${restaurant.username}?dish=${dish.id}`;
                    try {
                      await navigator.clipboard.writeText(url);
                      toast.success("Enlace del platillo copiado", {
                        description: "Compártelo con tus amigos para que lo vean.",
                      });
                    } catch {
                      toast.error("No se pudo copiar el enlace");
                    }
                  }}
                  className="active:scale-125 transition-transform"
                  aria-label="Compartir platillo"
                >
                  <Share2 className="w-6 h-6 text-foreground" />
                </button>
              </div>
              {dish.showRating && (
                <button
                  onClick={() => {
                    if (!isPreview) setReviewsForDish(dish);
                  }}
                  disabled={isPreview}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  aria-label="Ver y dejar reseñas"
                >
                  <Star className="w-4 h-4 text-accent fill-accent" />
                  <span className="text-sm font-semibold text-foreground">{Number(dish.rating).toFixed(1)}</span>
                </button>
              )}
            </div>

            {/* Likes */}
            <div className="px-4 pb-1">
              <p className="text-sm font-semibold text-foreground">
                {(dish.likes + (isLiked(dish.id) ? 1 : 0)).toLocaleString()} me gusta
              </p>
            </div>

            {/* Name + description */}
            <div className="px-4 pb-1">
              <p className="text-sm text-foreground">
                <span className="font-semibold">{dish.name}</span>{" "}
                {dish.description}
              </p>
            </div>

            {/* Price + tags */}
            <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-primary">
                ${dish.price} MXN
              </span>
              {dish.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Image lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center animate-fade-in overflow-hidden touch-none"
          onClick={() => setLightboxImage(null)}
          onWheel={() => setLightboxImage(null)}
          onTouchStart={(e) => {
            (e.currentTarget as HTMLDivElement).dataset.startY = String(e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            const startY = Number((e.currentTarget as HTMLDivElement).dataset.startY ?? 0);
            if (Math.abs(e.touches[0].clientY - startY) > 40) setLightboxImage(null);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImage(null);
            }}
            className="absolute top-4 right-4 text-white/90 hover:text-white p-2"
            aria-label="Cerrar imagen"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            className="max-w-[95vw] max-h-[90vh] object-contain animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {reviewsForDish && !isPreview && (
        <ReviewsModal
          open={!!reviewsForDish}
          onClose={() => setReviewsForDish(null)}
          title={`Reseñas de ${reviewsForDish.name}`}
          restaurantId={restaurant.id}
          dishId={reviewsForDish.id}
          onSubmitted={onReviewSubmitted}
        />
      )}
    </div>
  );
};

export default DishFeed;
