import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  author_name: string | null;
  created_at: string;
}

interface ReviewsModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  restaurantId: string;
  /** When set, this is a dish review. Otherwise it's a restaurant-level review. */
  dishId?: string;
  /** Notify parent so it can refresh the displayed average. */
  onSubmitted?: () => void;
  /** Applies only to restaurant-level reviews. Dish reviews remain independently available. */
  allowRestaurantSubmission?: boolean;
}

const STORAGE_KEY = "menu_review_name";

const ReviewsModal = ({
  open,
  onClose,
  title,
  restaurantId,
  dishId,
  onSubmitted,
  allowRestaurantSubmission = true,
}: ReviewsModalProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const canSubmit = dishId !== undefined || allowRestaurantSubmission;

  useEffect(() => {
    if (!open) return;
    setName(localStorage.getItem(STORAGE_KEY) ?? "");
    setComment("");
    setRating(5);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dishId, restaurantId]);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("reviews")
      .select("id, rating, comment, author_name, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(50);
    query = dishId ? query.eq("dish_id", dishId) : query.is("dish_id", null);
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setReviews((data ?? []) as Review[]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return;
    const trimmedComment = comment.trim().slice(0, 1000);
    const trimmedName = name.trim().slice(0, 80);
    setSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      restaurant_id: restaurantId,
      dish_id: dishId ?? null,
      rating,
      comment: trimmedComment || null,
      author_name: trimmedName || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("No se pudo enviar la reseña");
      return;
    }
    if (trimmedName) localStorage.setItem(STORAGE_KEY, trimmedName);
    toast.success("¡Gracias por tu reseña!");
    setComment("");
    onSubmitted?.();
    void load();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div
        className="bg-background w-full sm:max-w-md max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-base font-semibold text-foreground truncate pr-4">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar">
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3 space-y-4 flex-1">
          {/* Form */}
          {canSubmit && <div className="rounded-lg border border-border p-3 space-y-3 bg-card">
            <p className="text-sm font-medium text-foreground">Deja tu reseña</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className="p-1 active:scale-110 transition-transform"
                  aria-label={`${n} estrellas`}
                >
                  <Star className={`w-7 h-7 ${n <= rating ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 80))}
              placeholder="Tu nombre (opcional)"
              maxLength={80}
            />
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              placeholder="¿Qué te pareció? (opcional)"
              rows={3}
              maxLength={1000}
            />
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? "Enviando..." : "Enviar reseña"}
            </Button>
          </div>}

          {/* List */}
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
              Reseñas {reviews.length > 0 && `(${reviews.length})`}
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {canSubmit ? "Aún no hay reseñas. ¡Sé el primero!" : "Aún no hay reseñas."}
              </p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="border-b border-border pb-3 last:border-b-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      {r.author_name?.trim() || "Anónimo"}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-accent text-accent" : "text-muted-foreground/40"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-foreground mt-1 whitespace-pre-line">{r.comment}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsModal;
