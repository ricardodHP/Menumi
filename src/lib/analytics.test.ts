import { beforeEach, describe, expect, it, vi } from "vitest";

const insertMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: insertMock }),
  },
}));

import { getAnonymousSessionId, trackEvent } from "./analytics";

describe("WhatsApp analytics", () => {
  beforeEach(() => {
    sessionStorage.clear();
    insertMock.mockReset().mockResolvedValue({ error: null });
  });

  it("records one intentional click with its restaurant and anonymous session", async () => {
    await trackEvent({ restaurantId: "restaurant-a", eventType: "whatsapp_clicked" });

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith({
      restaurant_id: "restaurant-a",
      dish_id: null,
      category_id: null,
      event_type: "whatsapp_clicked",
      session_id: getAnonymousSessionId(),
    });
  });

  it("reuses the anonymous session id for the current browser session", () => {
    expect(getAnonymousSessionId()).toMatch(/^[0-9a-f-]{36}$/i);
    expect(getAnonymousSessionId()).toBe(getAnonymousSessionId());
  });
});
