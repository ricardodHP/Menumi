import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category, Dish, RestaurantInfo } from "@/data/restaurant";
import { filterPublicMenuRecords } from "@/lib/restaurant-public";
import { loadRestaurantBusinessHours } from "@/lib/business-hours-api";
import { normalizeInstagramUsername } from "@/lib/instagram";
import { normalizeMenuLayout } from "@/lib/menu-layout";
import { parseDeliveryLinks } from "@/lib/delivery-links";

const FALLBACK_DISH = "/seed/dishes/tacos-pastor.jpg";
const FALLBACK_LOGO = "/seed/restaurant-logo.png";

interface UseRestaurantDataResult {
  loading: boolean;
  notFound: boolean;
  restaurant: RestaurantInfo | null;
  categories: Category[];
  dishes: Dish[];
}

/**
 * Loads a restaurant + categories + dishes by slug.
 * Preview mode allows the owner/admin RLS path to inspect a draft without making
 * the regular `/r/:slug` route public.
 */
export function useRestaurantData(
  slug: string | undefined,
  options: { preview?: boolean } = {},
): UseRestaurantDataResult {
  const preview = options.preview ?? false;
  const [state, setState] = useState<UseRestaurantDataResult>({
    loading: true,
    notFound: false,
    restaurant: null,
    categories: [],
    dishes: [],
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        setState({ loading: false, notFound: true, restaurant: null, categories: [], dishes: [] });
        return;
      }
      setState((s) => ({ ...s, loading: true }));

      const restaurantQuery = supabase
        .from("restaurants")
        .select("*")
        .eq("slug", slug);
      const { data: r, error: rErr } = preview
        ? await restaurantQuery.maybeSingle()
        : await restaurantQuery.eq("status", "published").maybeSingle();

      if (cancelled) return;
      if (rErr || !r || (!preview && r.status !== "published")) {
        setState({ loading: false, notFound: true, restaurant: null, categories: [], dishes: [] });
        return;
      }

      const [cRes, dRes, hoursResult] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, emoji, image_url, position, is_visible")
          .eq("restaurant_id", r.id)
          .order("position", { ascending: true }),
        supabase
          .from("dishes")
          .select("id, name, description, price, image_url, rating, likes_count, tags, category_id, position, is_active, is_available, show_rating")
          .eq("restaurant_id", r.id)
          .eq("is_active", true)
          .order("position", { ascending: true }),
        loadRestaurantBusinessHours(r.id)
          .then((schedule) => ({ schedule, error: false }))
          .catch((error: unknown) => {
            console.error("Could not load restaurant business hours", error);
            return { schedule: null, error: true };
          }),
      ]);
      if (cancelled) return;

      const publicContent = filterPublicMenuRecords(cRes.data ?? [], dRes.data ?? []);

      // Load review counts per dish (single query, then aggregate client-side)
      const reviewCounts: Record<string, number> = {};
      const { data: revRows } = await supabase
        .from("reviews")
        .select("dish_id")
        .eq("restaurant_id", r.id)
        .not("dish_id", "is", null);
      (revRows ?? []).forEach((row) => {
        const id = row.dish_id;
        if (id) reviewCounts[id] = (reviewCounts[id] ?? 0) + 1;
      });

      const categories: Category[] = publicContent.categories.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji ?? "🍽️",
        image: c.image_url?.trim() ? c.image_url : FALLBACK_DISH,
        hasRealImage: Boolean(c.image_url?.trim()),
      }));

      const dishes: Dish[] = publicContent.dishes.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description ?? "",
        price: Number(d.price),
        image: d.image_url?.trim() ? d.image_url : FALLBACK_DISH,
        hasRealImage: Boolean(d.image_url?.trim()),
        category: d.category_id ?? "",
        rating: Number(d.rating),
        likes: d.likes_count,
        tags: d.tags ?? [],
        showRating: d.show_rating,
        isAvailable: d.is_available,
        reviewsCount: reviewCounts[d.id] ?? 0,
      }));

      const restaurant: RestaurantInfo = {
        id: r.id,
        name: r.name,
        username: r.slug,
        bio: r.bio ?? "",
        posts: dishes.length,
        whatsappLink: r.whatsapp_link ?? "",
        whatsappEnabled: r.whatsapp_enabled,
        phone: r.phone ?? undefined,
        deliveryLinks: parseDeliveryLinks(r.delivery_links),
        instagramUsername: normalizeInstagramUsername(r.instagram_link) ?? "",
        menuLayout: normalizeMenuLayout(r.menu_layout),
        ownerId: r.owner_id,
        address: r.address ?? undefined,
        hours: r.hours ?? undefined,
        businessHours: hoursResult.schedule,
        businessHoursLoadError: hoursResult.error,
        logo: r.logo_url ?? FALLBACK_LOGO,
        cuisineTemplate: r.cuisine_template,
        showByRating: r.show_by_rating,
        showRating: r.show_rating,
        allowReviews: r.allow_reviews,
      };

      setState({ loading: false, notFound: false, restaurant, categories, dishes });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug, preview]);

  return state;
}
