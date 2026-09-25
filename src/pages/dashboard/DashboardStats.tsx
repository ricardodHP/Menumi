import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManagedRestaurant } from "@/hooks/useManagedRestaurant";
import { Button } from "@/components/ui/button";
import { BarChart3, Eye, MessageCircle, ShoppingBag, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  analyzeDishOpportunities,
  aggregateDashboardEvents,
  fetchAllDashboardEventPages,
  getTopDishRankings,
  getDashboardPeriod,
  MIN_DISH_VIEW_SESSIONS_FOR_INSIGHT,
  TOP_DISH_RANKING_LIMIT,
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

const compactRangeLabel: Record<DashboardRange, string> = {
  day: "Día",
  week: "7 días",
  month: "30 días",
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
          supabase.from("dishes").select("id, name").eq("restaurant_id", restaurantId).eq("is_active", true),
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
    () => aggregateDashboardEvents(events, restaurant?.id ?? "", period, new Set(dishes.map((dish) => dish.id))),
    [events, restaurant?.id, period, dishes],
  );
  const opportunities = useMemo(
    () => analyzeDishOpportunities(stats.dishPerformance),
    [stats.dishPerformance],
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

  const viewedDishes = getTopDishRankings(stats.dishPerformance, "views")
    .map((entry) => ({ ...entry, dish: dishById.get(entry.dishId) }))
    .filter((entry) => entry.dish)
    .slice(0, TOP_DISH_RANKING_LIMIT);
  const addedDishes = getTopDishRankings(stats.dishPerformance, "adds")
    .map((entry) => ({ ...entry, dish: dishById.get(entry.dishId) }))
    .filter((entry) => entry.dish)
    .slice(0, TOP_DISH_RANKING_LIMIT);
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
        <div className="grid w-full grid-cols-3 gap-1 rounded-md border p-1 sm:flex sm:w-auto">
          {(["day", "week", "month"] as DashboardRange[]).map((period) => (
            <Button
              key={period}
              size="sm"
              variant={range === period ? "default" : "ghost"}
              onClick={() => setRange(period)}
              aria-pressed={range === period}
              className="h-8 min-w-0 whitespace-nowrap px-2 text-xs sm:px-3"
            >
              <span className="sm:hidden">{compactRangeLabel[period]}</span>
              <span className="hidden sm:inline">{rangeLabel[period]}</span>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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

          {stats.activityEventCount === 0 && (
            <p role="status" className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Aún no hay actividad suficiente para mostrar estadísticas en {rangeLabel[range].toLowerCase()}.
            </p>
          )}

          <OpportunitiesCard
            opportunities={opportunities.opportunities.map((opportunity) => ({
              ...opportunity,
              dish: dishById.get(opportunity.dishId),
            })).filter((opportunity) => opportunity.dish)}
            eligibleDishCount={opportunities.eligibleDishCount}
            periodLabel={rangeLabel[range].toLowerCase()}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ListCard
              title="Platillos más vistos"
              icon={<Eye className="h-4 w-4" />}
              empty="Sin vistas en este período"
              items={viewedDishes.map(({ dish, views, adds, viewingSessions, viewingSessionsWithAdd, addRate }) => ({
                name: dish!.name,
                value: `${views} vistas · ${adds} agregados`,
                detail: addRate === null
                  ? "Sin sesiones únicas para calcular una tasa"
                  : `${viewingSessionsWithAdd}/${viewingSessions} sesiones con vista y agregado · ${Math.round(addRate)}% tasa`,
              }))}
            />
            <ListCard
              title="Más agregados a Mi pedido"
              icon={<ShoppingBag className="h-4 w-4" />}
              empty="Sin agregados en este período"
              items={addedDishes.map(({ dish, adds, views, viewingSessions, addingSessions, viewingSessionsWithAdd, addRate }) => ({
                name: dish!.name,
                value: `${adds} agregados`,
                detail: addRate === null
                  ? `${addingSessions} sesiones agregaron · ${views} vistas · sin tasa de embudo`
                  : `${addingSessions} sesiones agregaron · ${viewingSessionsWithAdd}/${viewingSessions} sesiones con vista y agregado · ${Math.round(addRate)}% tasa`,
              }))}
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
        <div className="mb-1 flex min-h-9 items-start gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">{icon}</span>
          <span className="min-w-0 break-words leading-tight">{label}</span>
        </div>
        <p className="text-xl font-bold sm:text-2xl">{value.toLocaleString()}{suffix}</p>
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
  items: { name: string; value: string; detail?: string }[];
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
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li key={`${item.name}-${index}`} className="flex min-w-0 flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <span className="flex min-w-0 items-start gap-2">
                  <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] shrink-0">
                    {index + 1}
                  </Badge>
                  <span className="min-w-0">
                    <span className="block break-words">{item.name}</span>
                    {item.detail && <span className="block text-xs text-muted-foreground">{item.detail}</span>}
                  </span>
                </span>
                <span className="pl-7 font-semibold tabular-nums sm:pl-0 sm:text-right">{item.value}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function OpportunitiesCard({
  opportunities,
  eligibleDishCount,
  periodLabel,
}: {
  opportunities: {
    dishId: string;
    kind: "many_views_few_adds" | "high_add_rate";
    views: number;
    adds: number;
    addRate: number;
    viewingSessions: number;
    viewingSessionsWithAdd: number;
    dish: DishMeta | undefined;
  }[];
  eligibleDishCount: number;
  periodLabel: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4" /> Oportunidades
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Comparación relativa entre platillos con al menos {MIN_DISH_VIEW_SESSIONS_FOR_INSIGHT} sesiones únicas de vista en {periodLabel}.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {opportunities.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            {eligibleDishCount < 2
              ? "Aún no hay suficientes datos para comparar: se requieren al menos dos platillos con la muestra mínima."
              : "No aparecen diferencias claras entre platillos en este período."}
          </p>
        ) : (
          <ol className="space-y-2">
            {opportunities.map((opportunity) => (
              <li key={opportunity.dishId} className="rounded-md border p-3">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">{opportunity.dish!.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {opportunity.kind === "many_views_few_adds"
                        ? "Muchas vistas, pocos agregados"
                        : "Alta tasa de agregado"}
                    </p>
                  </div>
                  <p className="text-xs tabular-nums text-muted-foreground sm:text-right">
                    {opportunity.views} vistas · {opportunity.adds} agregados · {opportunity.viewingSessionsWithAdd}/{opportunity.viewingSessions} sesiones vieron y agregaron · {Math.round(opportunity.addRate)}% tasa
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          La tasa del embudo usa sesiones únicas con vista y agregado del mismo platillo ÷ sesiones únicas con vista. Describe interacción; no explica sus causas.
        </p>
      </CardContent>
    </Card>
  );
}
