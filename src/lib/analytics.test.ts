import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: insertMock }),
  },
}));

import { getAnonymousSessionId, trackEvent, trackMenuViewOnce } from "./analytics";

describe("public menu analytics", () => {
  beforeEach(() => {
    sessionStorage.clear();
    insertMock.mockReset().mockResolvedValue({ error: null });
  });

  it("reuses one stable anonymous session ID for every event in this browser tab", async () => {
    const sessionId = getAnonymousSessionId();
    await trackEvent({ restaurantId: "restaurant-a", eventType: "whatsapp_clicked", isPreview: false });
    await trackEvent({
      restaurantId: "restaurant-a",
      eventType: "selection_add",
      dishId: "dish-a",
      categoryId: "category-a",
      isPreview: false,
    });

    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(insertMock).toHaveBeenCalledWith({
      restaurant_id: "restaurant-a",
      dish_id: null,
      category_id: null,
      event_type: "whatsapp_clicked",
      session_id: sessionId,
    });
    expect(insertMock).toHaveBeenCalledWith({
      restaurant_id: "restaurant-a",
      dish_id: "dish-a",
      category_id: "category-a",
      event_type: "selection_add",
      session_id: sessionId,
    });
    expect(sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getAnonymousSessionId()).toBe(sessionId);
  });

  it("migrates the previous session key without creating a new analytics session", () => {
    const legacySessionId = "12345678-1234-4234-8234-123456789abc";
    sessionStorage.setItem("culinary_feed_analytics_session:v1", legacySessionId);

    expect(getAnonymousSessionId()).toBe(legacySessionId);
    expect(sessionStorage.getItem("menumi_analytics_session:v1")).toBe(legacySessionId);
    expect(sessionStorage.getItem("culinary_feed_analytics_session:v1")).toBeNull();
  });

  it("records at most one menu_view per restaurant and tab while allowing other restaurants", async () => {
    trackMenuViewOnce({ restaurantId: "restaurant-a", isPreview: false });
    trackMenuViewOnce({ restaurantId: "restaurant-a", isPreview: false });
    trackMenuViewOnce({ restaurantId: "restaurant-b", isPreview: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(insertMock).toHaveBeenCalledTimes(2);
    expect(insertMock.mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({ restaurant_id: "restaurant-a", event_type: "menu_view" }),
      expect.objectContaining({ restaurant_id: "restaurant-b", event_type: "menu_view" }),
    ]);
    expect(insertMock.mock.calls[0][0].session_id).toBe(insertMock.mock.calls[1][0].session_id);
  });

  it("migrates a previous menu-view marker without recording a duplicate view", async () => {
    sessionStorage.setItem("culinary_feed_menu_view:v1:restaurant-a", "1");

    trackMenuViewOnce({ restaurantId: "restaurant-a", isPreview: false });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sessionStorage.getItem("menumi_menu_view:v1:restaurant-a")).toBe("1");
    expect(sessionStorage.getItem("culinary_feed_menu_view:v1:restaurant-a")).toBeNull();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("suppresses every event centrally in preview mode", async () => {
    await trackEvent({ restaurantId: "restaurant-a", eventType: "selection_add", isPreview: true });
    trackMenuViewOnce({ restaurantId: "restaurant-a", isPreview: true });

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("keeps analytics failures non-throwing and reports insert errors in development", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    insertMock.mockResolvedValueOnce({ error: new Error("offline") });

    await expect(trackEvent({ restaurantId: "restaurant-a", eventType: "selection_add", isPreview: false })).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith("Analytics event insert failed", expect.any(Error));
    warn.mockRestore();
  });
});
