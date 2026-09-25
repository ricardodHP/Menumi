import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useRestaurantData } from "@/hooks/useRestaurantData";
import RestaurantView from "@/components/RestaurantView";
import { Button } from "@/components/ui/button";
import { useTableSession } from "@/hooks/useTableSession";
import { Users, X, Receipt } from "lucide-react";
import TableOrdersDrawer from "@/components/TableOrdersDrawer";
import { trackMenuViewOnce } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { isCuisineTemplate, MENU_LAYOUTS, normalizeMenuLayout } from "@/lib/menu-layout";

export default function RestaurantPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const preview = searchParams.get("preview") === "1";
  const { user, isAdmin, isOwner } = useAuth();
  const { loading, notFound, restaurant, categories, dishes } = useRestaurantData(slug, { preview });
  const { session, leave } = useTableSession();
  const [ordersOpen, setOrdersOpen] = useState(false);

  useEffect(() => {
    if (!loading && !notFound && restaurant) {
      trackMenuViewOnce({ restaurantId: restaurant.id, isPreview: preview });
    }
  }, [loading, notFound, preview, restaurant]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Cargando menú...
      </div>
    );
  }

  if (notFound || !restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-xl font-bold">Restaurante no encontrado</h1>
        <p className="text-sm text-muted-foreground">
          El menú "/r/{slug}" no existe o aún no está publicado.
        </p>
        <Button asChild>
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
  }

  const showBanner = session && session.restaurant_slug === slug;
  const canApplyPreviewOverrides = preview && (
    isAdmin || (isOwner && user?.id === restaurant.ownerId)
  );
  const requestedLayout = searchParams.get("menu_layout");
  const requestedTheme = searchParams.get("cuisine_template");
  const hasSupportedLayout = MENU_LAYOUTS.some((layout) => layout.value === requestedLayout);
  const previewRestaurant = canApplyPreviewOverrides
    ? {
        ...restaurant,
        menuLayout: hasSupportedLayout ? normalizeMenuLayout(requestedLayout) : restaurant.menuLayout,
        cuisineTemplate: isCuisineTemplate(requestedTheme)
          ? requestedTheme
          : restaurant.cuisineTemplate,
      }
    : restaurant;

  return (
    <>
      {preview && (
        <div
          role="status"
          className="sticky top-0 z-40 bg-amber-100 text-amber-950 text-xs px-3 py-2 text-center"
        >
          Vista previa: este menú no está publicado todavía.
        </div>
      )}
      {showBanner && (
        <div className="sticky top-0 z-40 bg-primary text-primary-foreground text-xs px-3 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Estás en <strong>{session.table_label}</strong> · {session.alias}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setOrdersOpen(true)}
              className="flex items-center gap-1 opacity-95 hover:opacity-100 underline-offset-2 hover:underline"
            >
              <Receipt className="h-3.5 w-3.5" /> Mis pedidos
            </button>
            <button
              onClick={leave}
              className="flex items-center gap-1 opacity-90 hover:opacity-100"
              aria-label="Salir de la mesa"
            >
              Salir <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
      <RestaurantView
        restaurant={previewRestaurant}
        categories={categories}
        dishes={dishes}
        isPreview={preview}
      />
      {showBanner && (
        <TableOrdersDrawer
          open={ordersOpen}
          onClose={() => setOrdersOpen(false)}
          code={session.code}
        />
      )}
    </>
  );
}
