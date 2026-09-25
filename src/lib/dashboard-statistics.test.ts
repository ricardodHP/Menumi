import { describe, expect, it } from "vitest";
import {
  analyzeDishOpportunities,
  aggregateDashboardEvents,
  fetchAllDashboardEventPages,
  getTopDishRankings,
  getDashboardPeriod,
  MIN_DISH_VIEW_SESSIONS_FOR_INSIGHT,
  type DashboardEvent,
  type DishPerformance,
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
    expect(result.dishPerformance).toEqual([{
      dishId: "dish-a",
      views: 3,
      viewingSessions: 1,
      adds: 0,
      addingSessions: 0,
      viewingSessionsWithAdd: 0,
      addRate: 0,
    }]);
  });

  it("counts selection additions and compatible historical cart_add rows", () => {
    const result = aggregateDashboardEvents([
      event("selection_add", "session-1", { dish_id: "dish-a" }),
      event("cart_add", "session-1", { dish_id: "dish-a" }),
    ], "restaurant-a");

    expect(result.selectionAdds).toBe(2);
    expect(result.addedDishes).toEqual([{ dishId: "dish-a", count: 2 }]);
    expect(result.dishPerformance).toEqual([{
      dishId: "dish-a",
      views: 0,
      viewingSessions: 0,
      adds: 2,
      addingSessions: 1,
      viewingSessionsWithAdd: 0,
      addRate: null,
    }]);
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

  it("counts only current-tenant events in the selected period for the no-activity state", () => {
    const result = aggregateDashboardEvents([
      event("menu_view", "current", { created_at: "2026-09-24T10:00:00.000Z" }),
      event("menu_view", "old", { created_at: "2026-09-20T10:00:00.000Z" }),
      event("menu_view", "foreign", {
        restaurant_id: "restaurant-b",
        created_at: "2026-09-24T10:00:00.000Z",
      }),
    ], "restaurant-a", {
      since: "2026-09-24T00:00:00.000Z",
      until: "2026-09-24T23:59:59.999Z",
    });

    expect(result.activityEventCount).toBe(1);
    expect(aggregateDashboardEvents([], "restaurant-a").activityEventCount).toBe(0);
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

  it("exposes raw counts and unique dish sessions without repeated events inflating the rate", () => {
    const result = aggregateDashboardEvents([
      event("dish_view", "session-1", { dish_id: "dish-a" }),
      event("dish_view", "session-1", { dish_id: "dish-a" }),
      event("dish_view", "session-2", { dish_id: "dish-a" }),
      event("selection_add", "session-1", { dish_id: "dish-a" }),
      event("selection_add", "session-1", { dish_id: "dish-a" }),
      event("selection_add", "session-3", { dish_id: "dish-a" }),
      event("selection_add", null, { dish_id: "dish-without-session" }),
    ], "restaurant-a");

    expect(result.dishPerformance).toEqual([
      {
        dishId: "dish-a",
        views: 3,
        viewingSessions: 2,
        adds: 3,
        addingSessions: 2,
        viewingSessionsWithAdd: 1,
        addRate: 50,
      },
      {
        dishId: "dish-without-session",
        views: 0,
        viewingSessions: 0,
        adds: 1,
        addingSessions: 0,
        viewingSessionsWithAdd: 0,
        addRate: null,
      },
    ]);
  });

  it("uses only sessions with both view and add for the funnel rate and suppresses a false opportunity", () => {
    const events: DashboardEvent[] = [];
    for (let index = 0; index < 10; index++) {
      events.push(event("dish_view", `shared-${index}`, { dish_id: "dish-a" }));
      events.push(event("dish_view", `other-${index}`, { dish_id: "dish-b" }));
    }
    for (let index = 0; index < 5; index++) {
      events.push(event("selection_add", `shared-${index}`, { dish_id: "dish-a" }));
      events.push(event("selection_add", `other-${index}`, { dish_id: "dish-b" }));
    }
    for (let index = 0; index < 10; index++) {
      events.push(event("selection_add", `without-view-${index}`, { dish_id: "dish-a" }));
    }

    const stats = aggregateDashboardEvents(events, "restaurant-a");
    const dish = stats.dishPerformance.find(({ dishId }) => dishId === "dish-a")!;

    expect(dish).toMatchObject({
      views: 10,
      viewingSessions: 10,
      adds: 15,
      addingSessions: 15,
      viewingSessionsWithAdd: 5,
      addRate: 50,
    });
    expect(dish.addRate).toBeLessThanOrEqual(100);
    expect(analyzeDishOpportunities(stats.dishPerformance).opportunities).toEqual([]);
  });

  it("does not generate opportunities from low samples or a single eligible dish", () => {
    expect(MIN_DISH_VIEW_SESSIONS_FOR_INSIGHT).toBe(10);
    const events = Array.from({ length: 9 }, (_, index) =>
      event("dish_view", `session-${index}`, { dish_id: "dish-a" }),
    );
    events.push(event("selection_add", "session-0", { dish_id: "dish-a" }));
    events.push(event("dish_view", "single-session", { dish_id: "one-view-one-add" }));
    events.push(event("selection_add", "single-session", { dish_id: "one-view-one-add" }));
    const oneEligible = Array.from({ length: 10 }, (_, index) =>
      event("dish_view", `eligible-${index}`, { dish_id: "dish-b" }),
    );

    const lowSample = aggregateDashboardEvents(events, "restaurant-a");
    const singleEligible = aggregateDashboardEvents(oneEligible, "restaurant-a");

    expect(analyzeDishOpportunities(lowSample.dishPerformance)).toEqual({
      eligibleDishCount: 0,
      opportunities: [],
    });
    expect(analyzeDishOpportunities(singleEligible.dishPerformance)).toEqual({
      eligibleDishCount: 1,
      opportunities: [],
    });
  });

  it("identifies relative low-add and high-add patterns only after minimum samples", () => {
    const events: DashboardEvent[] = [];
    for (let index = 0; index < 20; index++) {
      events.push(event("dish_view", `session-${index}`, { dish_id: "dish-low" }));
      events.push(event("dish_view", `session-${index}`, { dish_id: "dish-high" }));
    }
    events.push(event("selection_add", "session-0", { dish_id: "dish-low" }));
    for (let index = 0; index < 10; index++) {
      events.push(event("selection_add", `session-${index}`, { dish_id: "dish-high" }));
    }

    const stats = aggregateDashboardEvents(events, "restaurant-a");
    const result = analyzeDishOpportunities(stats.dishPerformance);

    expect(result.eligibleDishCount).toBe(2);
    expect(result.opportunities.map(({ dishId, kind }) => ({ dishId, kind }))).toEqual([
      { dishId: "dish-high", kind: "high_add_rate" },
      { dishId: "dish-low", kind: "many_views_few_adds" },
    ]);
  });

  it("caps visible opportunities at three", () => {
    const rates = [0, 0, 50, 100, 100];
    const dishes: DishPerformance[] = rates.map((rate, index) => ({
      dishId: `dish-${index}`,
      views: 10,
      viewingSessions: 10,
      adds: rate,
      addingSessions: rate,
      viewingSessionsWithAdd: rate,
      addRate: rate,
    }));

    expect(analyzeDishOpportunities(dishes).opportunities).toHaveLength(3);
  });

  it("limits dish rankings to five and excludes hidden or orphan dish events", () => {
    const events: DashboardEvent[] = [];
    for (let index = 1; index <= 7; index++) {
      events.push(event("dish_view", `s-${index}`, { dish_id: `dish-${index}` }));
      for (let repeat = 0; repeat < index; repeat++) {
        events.push(event("selection_add", `a-${index}-${repeat}`, { dish_id: `dish-${index}` }));
      }
    }
    events.push(event("dish_view", "hidden-view", { dish_id: "hidden-dish" }));
    events.push(event("selection_add", "orphan-add", { dish_id: "deleted-dish" }));
    events.push(event("dish_view", "foreign-view", { dish_id: "foreign-dish", restaurant_id: "restaurant-b" }));

    const stats = aggregateDashboardEvents(events, "restaurant-a", undefined, new Set(
      Array.from({ length: 7 }, (_, index) => `dish-${index + 1}`),
    ));

    expect(getTopDishRankings(stats.dishPerformance, "views").map(({ dishId }) => dishId)).toEqual([
      "dish-1", "dish-2", "dish-3", "dish-4", "dish-5",
    ]);
    expect(getTopDishRankings(stats.dishPerformance, "adds").map(({ dishId }) => dishId)).toEqual([
      "dish-7", "dish-6", "dish-5", "dish-4", "dish-3",
    ]);
    expect(stats.dishViews).toBe(8);
    expect(stats.selectionAdds).toBe(29);
    expect(stats.dishPerformance).toHaveLength(7);
  });

  it("keeps dish performance scoped to the selected period, tenant, and current active catalog", () => {
    const events = [
      event("dish_view", "session-now", { dish_id: "dish-a", created_at: "2026-09-24T10:00:00.000Z" }),
      event("selection_add", "session-now", { dish_id: "dish-a", created_at: "2026-09-24T10:05:00.000Z" }),
      event("dish_view", "session-old", { dish_id: "dish-a", created_at: "2026-09-20T10:00:00.000Z" }),
      event("dish_view", "session-foreign", {
        restaurant_id: "restaurant-b",
        dish_id: "dish-a",
        created_at: "2026-09-24T10:00:00.000Z",
      }),
      event("dish_view", "session-orphan", {
        dish_id: "deleted-dish",
        created_at: "2026-09-24T10:00:00.000Z",
      }),
    ];

    const result = aggregateDashboardEvents(events, "restaurant-a", {
      since: "2026-09-24T00:00:00.000Z",
      until: "2026-09-24T23:59:59.999Z",
    }, new Set(["dish-a"]));

    expect(result.dishPerformance).toEqual([{
      dishId: "dish-a",
      views: 1,
      viewingSessions: 1,
      adds: 1,
      addingSessions: 1,
      viewingSessionsWithAdd: 1,
      addRate: 100,
    }]);

    const expandedPeriod = aggregateDashboardEvents(events, "restaurant-a", {
      since: "2026-09-18T00:00:00.000Z",
      until: "2026-09-24T23:59:59.999Z",
    }, new Set(["dish-a"]));
    expect(expandedPeriod.dishPerformance[0]).toMatchObject({ views: 2, viewingSessions: 2 });
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
