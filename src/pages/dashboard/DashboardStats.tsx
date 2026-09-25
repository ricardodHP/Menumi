import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { Button } from "@/components/ui/button";
import { BarChart3, Eye, MessageCircle, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  aggregateDashboardEvents,
  fetchAllDashboardEventPages,
  getDashboardPeriod,
  type DashboardEvent,
  type DashboardRange,
} from "@/lib/dashboard-statistics";

interface DishMeta {
  id: string;
  name: string;
}

interface CategoryMeta {
  id: string;
  name: string;
  emoji: string | null;
}

const rangeLabel: Record<DashboardRange, string> = {
  day: "Hoy",
  week: "Últimos 7 días",
  month: "Últimos 30 días",
};

export default function DashboardStats() {
  const { restaurant, loading: loadingR } = useManagedRestaurant();
  const [range, setRange] = useState<DashboardRange>("week");
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [dishes, setDishes] = useState<DishMeta[]>([]);
  const [categories, setCategories] = useState<CategoryMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const period = useMemo(() => getDashboardPeriod(range), [range]);

  useEffect(() => {
    const restaurantId = restaurant?.id;
    if (!restaurantId) return;

    let cancelled = false;
    const { since, until } = period;
    setLoading(true);
    setError(false);

    async function load() {
      try {
        const [eventRows, dishResult, categoryResult] = await Promise.all([
          fetchAllDashboardEventPages(async (from, to) => {
            const { data, error: queryError } = await supabase
              .from("dish_events")
              .select("restaurant_id, event_type, dish_id, category_id, session_id, created_at")
              .eq("restaurant_id", restaurantId)
              .gte("created_at", since)
              .lte("created_at", until)
              .order("created_at", { ascending: false })
              .range(from, to);
            if (queryError) throw queryError;
            return (data ?? []) as DashboardEvent[];
          }),
          supabase.from("dishes").select("id, name").eq("restaurant_id", restaurantId),
          supabase.from("categories").select("id, name, emoji").eq("restaurant_id", restaurantId),
        ]);

        if (dishResult.error) throw dishResult.error;
        if (categoryResult.error) throw categoryResult.error;
        if (cancelled) return;

        setEvents(eventRows);
        setDishes((dishResult.data ?? []) as DishMeta[]);
        setCategories((categoryResult.data ?? []) as CategoryMeta[]);
        setLoading(false);
      } catch (loadError) {
        console.error("Failed to load dashboard statistics", loadError);
        if (cancelled) return;
        setError(true);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [restaurant?.id, range, period, refreshKey]);

  const stats = useMemo(
    () => aggregateDashboardEvents(events, restaurant?.id ?? "", period),
    [events, restaurant?.id, period],
  );
  const dishById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  if (loadingR) {
    return (
      <DashboardLayout>
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aún no tienes un restaurante asignado.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const viewedDishes = stats.viewedDishes
    .map((entry) => ({ ...entry, dish: dishById.get(entry.dishId) }))
    .filter((entry) => entry.dish)
    .slice(0, 5);
  const addedDishes = stats.addedDishes
    .map((entry) => ({ ...entry, dish: dishById.get(entry.dishId) }))
    .filter((entry) => entry.dish)
    .slice(0, 5);
  const topCategories = stats.categories
    .map((entry) => ({ ...entry, category: categoryById.get(entry.categoryId) }))
    .filter((entry) => entry.category)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Estadísticas
          </h2>
          <p className="text-sm text-muted-foreground">
            Interacciones con tu menú — {rangeLabel[range].toLowerCase()}
          </p>
        </div>
        <div className="flex gap-1 border rounded-md p-1">
          {(["day", "week", "month"] as DashboardRange[]).map((period) => (
            <Button
              key={period}
              size="sm"
              variant={range === period ? "default" : "ghost"}
              onClick={() => setRange(period)}
              className="h-7 px-3 text-xs"
            >
              {rangeLabel[period]}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">No se pudieron cargar las estadísticas.</p>
            <Button size="sm" variant="outline" onClick={() => setRefreshKey((key) => key + 1)}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard icon={<Eye className="h-4 w-4" />} label="Visitas al menú" value={stats.menuVisits} />
            <StatCard icon={<Eye className="h-4 w-4" />} label="Vistas a platillos" value={stats.dishViews} />
            <StatCard
              icon={<ShoppingBag className="h-4 w-4" />}
              label="Agregados a Mi pedido"
              value={stats.selectionAdds}
            />
            <StatCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Tasa de agregado"
              value={stats.selectionRate}
              suffix="%"
            />
            {restaurant.whatsapp_enabled && (
              <StatCard
                icon={<MessageCircle className="h-4 w-4" />}
                label="Clicks en WhatsApp"
                value={stats.whatsappClicks}
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ListCard
              title="Más vistos"
              icon={<Eye className="h-4 w-4" />}
              empty="Sin vistas en este período"
              items={viewedDishes.map(({ dish, count, addRate }) => ({
                name: dish!.name,
                value: `${count} vistas${addRate === null ? "" : ` · ${Math.round(addRate)}% agregados`}`,
              }))}
            />
            <ListCard
              title="Más agregados a Mi pedido"
              icon={<ShoppingBag className="h-4 w-4" />}
              empty="Sin agregados en este período"
              items={addedDishes.map(({ dish, count }) => ({ name: dish!.name, value: `${count}` }))}
            />
            <ListCard
              title="Categorías más vistas"
              icon={<BarChart3 className="h-4 w-4" />}
              empty="Sin vistas a categorías"
              items={topCategories.map(({ category, count }) => ({
                name: `${category!.emoji ?? "🍽️"} ${category!.name}`,
                value: `${count}`,
              }))}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Los períodos usan el día calendario y la zona horaria local del navegador. Las visitas al menú se registran desde la nueva analítica; no hay sesiones históricas reconstruibles.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon} {label}
        </div>
        <p className="text-2xl font-bold">{value.toLocaleString()}{suffix}</p>
      </CardContent>
    </Card>
  );
}

function ListCard({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: { name: string; value: string }[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">{empty}</p>
        ) : (
          <ol className="space-y-1.5">
            {items.map((item, index) => (
              <li key={item.name} className="flex items-center justify-between text-sm gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] shrink-0">
                    {index + 1}
                  </Badge>
                  <span className="truncate">{item.name}</span>
                </span>
                <span className="font-semibold tabular-nums shrink-0">{item.value}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
