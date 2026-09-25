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

  return {
    menuVisits: menuSessions.size,
    dishViews,
    selectionAdds,
    selectionRate: menuSessions.size ? (selectionSessions.size / menuSessions.size) * 100 : 0,
    whatsappClicks,
    viewedDishes: [...dishViewCounts.entries()]
      .map(([dishId, count]) => {
        const viewSessions = dishViewSessions.get(dishId)?.size ?? 0;
        const addSessions = dishSelectionSessions.get(dishId)?.size ?? 0;
        return { dishId, count, addRate: viewSessions ? (addSessions / viewSessions) * 100 : null };
      })
      .sort((a, b) => b.count - a.count),
    addedDishes: [...dishSelectionCounts.entries()]
      .map(([dishId, count]) => ({ dishId, count }))
      .sort((a, b) => b.count - a.count),
    categories: [...categoryCounts.entries()]
      .map(([categoryId, count]) => ({ categoryId, count }))
      .sort((a, b) => b.count - a.count),
  };
}
