import { describe, expect, it } from "vitest";
import {
  aggregateDashboardEvents,
  fetchAllDashboardEventPages,
  getDashboardPeriod,
  type DashboardEvent,
} from "@/lib/dashboard-statistics";

const event = (
  event_type: DashboardEvent["event_type"],
  session_id: string | null,
  overrides: Partial<DashboardEvent> = {},
): DashboardEvent => ({
  restaurant_id: "restaurant-a",
  event_type,
  dish_id: null,
  category_id: null,
  session_id,
  created_at: "2026-09-24T18:00:00.000Z",
  ...overrides,
});

describe("dashboard statistics", () => {
  it("counts menu sessions uniquely and ignores rows from another restaurant", () => {
    const result = aggregateDashboardEvents([
      event("menu_view", "session-1"),
      event("menu_view", "session-1"),
      event("menu_view", "session-2"),
      event("menu_view", "foreign-session", { restaurant_id: "restaurant-b" }),
    ], "restaurant-a");

    expect(result.menuVisits).toBe(2);
  });

  it("counts raw intentional dish views, including compatible historical view rows", () => {
    const result = aggregateDashboardEvents([
      event("dish_view", "session-1", { dish_id: "dish-a" }),
      event("dish_view", "session-1", { dish_id: "dish-a" }),
      event("view", null, { dish_id: "dish-a" }),
    ], "restaurant-a");

    expect(result.dishViews).toBe(3);
    expect(result.viewedDishes).toEqual([{ dishId: "dish-a", count: 3, addRate: 0 }]);
  });

  it("counts selection additions and compatible historical cart_add rows", () => {
    const result = aggregateDashboardEvents([
      event("selection_add", "session-1", { dish_id: "dish-a" }),
      event("cart_add", "session-1", { dish_id: "dish-a" }),
    ], "restaurant-a");

    expect(result.selectionAdds).toBe(2);
    expect(result.addedDishes).toEqual([{ dishId: "dish-a", count: 2 }]);
  });

  it("computes selection rate from unique sessions rather than raw event counts", () => {
    const result = aggregateDashboardEvents([
      event("menu_view", "session-1"),
      event("menu_view", "session-2"),
      event("selection_add", "session-1", { dish_id: "dish-a" }),
      event("selection_add", "session-1", { dish_id: "dish-a" }),
    ], "restaurant-a");

    expect(result.selectionRate).toBe(50);
  });

  it("returns a safe zero selection rate when there are no menu sessions", () => {
    expect(aggregateDashboardEvents([], "restaurant-a").selectionRate).toBe(0);
  });

  it("uses the selected local calendar period and excludes earlier events", () => {
    const now = new Date(2026, 8, 24, 15, 30);
    const today = getDashboardPeriod("day", now);
    const week = getDashboardPeriod("week", now);
    const month = getDashboardPeriod("month", now);

    expect(today.since).toBe(new Date(2026, 8, 24, 0, 0, 0, 0).toISOString());
    expect(week.since).toBe(new Date(2026, 8, 18, 0, 0, 0, 0).toISOString());
    expect(month.since).toBe(new Date(2026, 7, 26, 0, 0, 0, 0).toISOString());
    expect(today.until).toBe(now.toISOString());
  });

  it("changes reported totals when the selected event period changes", () => {
    const events = [
      event("menu_view", "session-1", { created_at: "2026-09-24T10:00:00.000Z" }),
      event("menu_view", "session-2", { created_at: "2026-09-20T10:00:00.000Z" }),
    ];

    expect(aggregateDashboardEvents(events, "restaurant-a", {
      since: "2026-09-24T00:00:00.000Z",
      until: "2026-09-24T23:59:59.999Z",
    }).menuVisits).toBe(1);
    expect(aggregateDashboardEvents(events, "restaurant-a", {
      since: "2026-09-18T00:00:00.000Z",
      until: "2026-09-24T23:59:59.999Z",
    }).menuVisits).toBe(2);
  });

  it("uses whatsapp_clicked for the WhatsApp interaction metric", () => {
    const result = aggregateDashboardEvents([
      event("whatsapp_clicked", "session-1"),
      event("selection_add", "session-1", { dish_id: "dish-a" }),
    ], "restaurant-a");

    expect(result.whatsappClicks).toBe(1);
  });

  it("retains category_view ranking within the selected restaurant", () => {
    const result = aggregateDashboardEvents([
      event("category_view", "session-1", { category_id: "category-a" }),
      event("category_view", "session-2", { category_id: "category-a" }),
    ], "restaurant-a");

    expect(result.categories).toEqual([{ categoryId: "category-a", count: 2 }]);
  });

  it("computes per-dish add rate from unique sessions and leaves a zero-view rate undefined", () => {
    const result = aggregateDashboardEvents([
      event("dish_view", "session-1", { dish_id: "dish-a" }),
      event("dish_view", "session-1", { dish_id: "dish-a" }),
      event("dish_view", "session-2", { dish_id: "dish-a" }),
      event("selection_add", "session-1", { dish_id: "dish-a" }),
      event("selection_add", "session-1", { dish_id: "dish-a" }),
      event("selection_add", "session-3", { dish_id: "dish-b" }),
    ], "restaurant-a");

    expect(result.viewedDishes).toEqual([{ dishId: "dish-a", count: 3, addRate: 50 }]);
    expect(result.addedDishes).toEqual([{ dishId: "dish-a", count: 2 }, { dishId: "dish-b", count: 1 }]);
  });

  it("loads every page so event totals are not silently capped", async () => {
    const pages: number[] = [];
    const rows = await fetchAllDashboardEventPages(async (from, to) => {
      pages.push(from);
      const all = Array.from({ length: 1501 }, (_, index) => index);
      return all.slice(from, to + 1);
    }, 1000);

    expect(pages).toEqual([0, 1000]);
    expect(rows).toHaveLength(1501);
  });
});
