export type DashboardRange = "day" | "week" | "month";

export interface DashboardEvent {
  restaurant_id: string;
  event_type:
    | "menu_view"
    | "dish_view"
    | "selection_add"
    | "whatsapp_clicked"
    | "category_view"
    | "view"
    | "cart_add";
  dish_id: string | null;
  category_id: string | null;
  session_id: string | null;
  created_at: string;
}

export interface DashboardPeriod {
  since: string;
  until: string;
}

export const MIN_DISH_VIEW_SESSIONS_FOR_INSIGHT = 10;
export const MIN_OPPORTUNITY_RATE_GAP_PERCENT = 10;
export const MAX_DISH_OPPORTUNITIES = 3;
export const TOP_DISH_RANKING_LIMIT = 5;

export interface DishPerformance {
  dishId: string;
  views: number;
  viewingSessions: number;
  adds: number;
  addingSessions: number;
  viewingSessionsWithAdd: number;
  addRate: number | null;
}

export type DishOpportunityKind = "many_views_few_adds" | "high_add_rate";

export interface DishOpportunity {
  dishId: string;
  kind: DishOpportunityKind;
  views: number;
  adds: number;
  addRate: number;
  viewingSessions: number;
  viewingSessionsWithAdd: number;
  rateDifference: number;
}

export function getDashboardPeriod(range: DashboardRange, now = new Date()) {
  const since = new Date(now);
  since.setHours(0, 0, 0, 0);
  const days = range === "day" ? 1 : range === "week" ? 7 : 30;
  since.setDate(since.getDate() - days + 1);

  return { since: since.toISOString(), until: now.toISOString() };
}

export async function fetchAllDashboardEventPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export function aggregateDashboardEvents(
  events: DashboardEvent[],
  restaurantId: string,
  period?: DashboardPeriod,
  activeDishIds?: ReadonlySet<string>,
) {
  const from = period ? new Date(period.since).getTime() : Number.NEGATIVE_INFINITY;
  const until = period ? new Date(period.until).getTime() : Number.POSITIVE_INFINITY;
  const scopedEvents = events.filter((event) => {
    const timestamp = new Date(event.created_at).getTime();
    return event.restaurant_id === restaurantId && timestamp >= from && timestamp <= until;
  });
  const menuSessions = new Set<string>();
  const selectionSessions = new Set<string>();
  const dishViewCounts = new Map<string, number>();
  const dishViewSessions = new Map<string, Set<string>>();
  const dishSelectionSessions = new Map<string, Set<string>>();
  const dishSelectionCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  let dishViews = 0;
  let selectionAdds = 0;
  let whatsappClicks = 0;

  for (const event of scopedEvents) {
    if (event.event_type === "menu_view" && event.session_id) {
      menuSessions.add(event.session_id);
    }
    if (event.event_type === "selection_add" || event.event_type === "cart_add") {
      selectionAdds++;
      if (event.session_id) selectionSessions.add(event.session_id);
      if (event.dish_id) {
        dishSelectionCounts.set(event.dish_id, (dishSelectionCounts.get(event.dish_id) ?? 0) + 1);
        if (event.session_id) {
          const sessions = dishSelectionSessions.get(event.dish_id) ?? new Set<string>();
          sessions.add(event.session_id);
          dishSelectionSessions.set(event.dish_id, sessions);
        }
      }
    }
    if (event.event_type === "dish_view" || event.event_type === "view") {
      dishViews++;
      if (event.dish_id) {
        dishViewCounts.set(event.dish_id, (dishViewCounts.get(event.dish_id) ?? 0) + 1);
        if (event.session_id) {
          const sessions = dishViewSessions.get(event.dish_id) ?? new Set<string>();
          sessions.add(event.session_id);
          dishViewSessions.set(event.dish_id, sessions);
        }
      }
    }
    if (event.event_type === "whatsapp_clicked") whatsappClicks++;
    if (event.event_type === "category_view" && event.category_id) {
      categoryCounts.set(event.category_id, (categoryCounts.get(event.category_id) ?? 0) + 1);
    }
  }

  const dishPerformance: DishPerformance[] = [...new Set([
    ...dishViewCounts.keys(),
    ...dishSelectionCounts.keys(),
  ])]
    .filter((dishId) => !activeDishIds || activeDishIds.has(dishId))
    .map((dishId) => {
      const views = dishViewCounts.get(dishId) ?? 0;
      const viewingSessionIds = dishViewSessions.get(dishId) ?? new Set<string>();
      const viewingSessions = viewingSessionIds.size;
      const adds = dishSelectionCounts.get(dishId) ?? 0;
      const addingSessionIds = dishSelectionSessions.get(dishId) ?? new Set<string>();
      const addingSessions = addingSessionIds.size;
      let viewingSessionsWithAdd = 0;
      for (const sessionId of addingSessionIds) {
        if (viewingSessionIds.has(sessionId)) viewingSessionsWithAdd++;
      }
      return {
        dishId,
        views,
        viewingSessions,
        adds,
        addingSessions,
        viewingSessionsWithAdd,
        addRate: viewingSessions
          ? (viewingSessionsWithAdd / viewingSessions) * 100
          : null,
      };
    })
    .sort((a, b) => a.dishId.localeCompare(b.dishId));

  return {
    activityEventCount: scopedEvents.length,
    menuVisits: menuSessions.size,
    dishViews,
    selectionAdds,
    selectionRate: menuSessions.size ? (selectionSessions.size / menuSessions.size) * 100 : 0,
    whatsappClicks,
    dishPerformance,
    viewedDishes: dishPerformance
      .filter(({ views }) => views > 0)
      .map(({ dishId, views, addRate }) => ({ dishId, count: views, addRate }))
      .sort((a, b) => b.count - a.count || a.dishId.localeCompare(b.dishId)),
    addedDishes: [...dishSelectionCounts.entries()]
      .filter(([dishId]) => !activeDishIds || activeDishIds.has(dishId))
      .map(([dishId, count]) => ({ dishId, count }))
      .sort((a, b) => b.count - a.count || a.dishId.localeCompare(b.dishId)),
    categories: [...categoryCounts.entries()]
      .map(([categoryId, count]) => ({ categoryId, count }))
      .sort((a, b) => b.count - a.count || a.categoryId.localeCompare(b.categoryId)),
  };
}

export function getTopDishRankings(
  dishes: DishPerformance[],
  metric: "views" | "adds",
  limit = TOP_DISH_RANKING_LIMIT,
) {
  return [...dishes]
    .filter((dish) => dish[metric] > 0)
    .sort((a, b) => b[metric] - a[metric] || a.dishId.localeCompare(b.dishId))
    .slice(0, Math.max(0, limit));
}

export function analyzeDishOpportunities(
  dishes: DishPerformance[],
  maxItems = MAX_DISH_OPPORTUNITIES,
) {
  const eligible = dishes.filter(
    (dish) => dish.viewingSessions >= MIN_DISH_VIEW_SESSIONS_FOR_INSIGHT && dish.addRate !== null,
  );
  if (eligible.length < 2 || maxItems <= 0) {
    return { eligibleDishCount: eligible.length, opportunities: [] as DishOpportunity[] };
  }

  const rates = eligible.map(({ addRate }) => addRate!).sort((a, b) => a - b);
  const middle = Math.floor(rates.length / 2);
  const medianRate = rates.length % 2 ? rates[middle] : (rates[middle - 1] + rates[middle]) / 2;
  const materialRateGap = Math.max(
    MIN_OPPORTUNITY_RATE_GAP_PERCENT,
    medianRate * 0.25,
  );

  const opportunities = eligible.flatMap((dish): DishOpportunity[] => {
    const rateDifference = Number((dish.addRate! - medianRate).toFixed(6));
    if (rateDifference <= -materialRateGap) {
      return [{
        dishId: dish.dishId,
        kind: "many_views_few_adds",
        views: dish.views,
        adds: dish.adds,
        addRate: dish.addRate!,
        viewingSessions: dish.viewingSessions,
        viewingSessionsWithAdd: dish.viewingSessionsWithAdd,
        rateDifference,
      }];
    }
    if (rateDifference >= materialRateGap) {
      return [{
        dishId: dish.dishId,
        kind: "high_add_rate",
        views: dish.views,
        adds: dish.adds,
        addRate: dish.addRate!,
        viewingSessions: dish.viewingSessions,
        viewingSessionsWithAdd: dish.viewingSessionsWithAdd,
        rateDifference,
      }];
    }
    return [];
  })
    .sort((a, b) => Math.abs(b.rateDifference) - Math.abs(a.rateDifference) || a.dishId.localeCompare(b.dishId))
    .slice(0, Math.min(MAX_DISH_OPPORTUNITIES, maxItems));

  return { eligibleDishCount: eligible.length, opportunities };
}
