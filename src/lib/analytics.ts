import { supabase } from "@/integrations/supabase/client";

export type EventType = "menu_view" | "dish_view" | "selection_add" | "category_view" | "whatsapp_clicked";

const ANALYTICS_SESSION_KEY = "culinary_feed_analytics_session:v1";
const MENU_VIEW_KEY_PREFIX = "culinary_feed_menu_view:v1:";
let fallbackSessionId: string | null = null;
const fallbackMenuViews = new Set<string>();

function createSessionId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  if (!cryptoApi) {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
      const random = Math.floor(Math.random() * 16);
      return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
    });
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getAnonymousSessionId(): string {
  try {
    const existing = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const fresh = createSessionId();
    sessionStorage.setItem(ANALYTICS_SESSION_KEY, fresh);
    return fresh;
  } catch {
    fallbackSessionId ??= createSessionId();
    return fallbackSessionId;
  }
}

export async function trackEvent(params: {
  restaurantId: string;
  eventType: EventType;
  dishId?: string;
  categoryId?: string;
  isPreview: boolean;
}) {
  if (params.isPreview) return;

  try {
    const event = {
      restaurant_id: params.restaurantId,
      dish_id: params.dishId ?? null,
      category_id: params.categoryId ?? null,
      event_type: params.eventType,
      session_id: getAnonymousSessionId(),
    };
    const { error } = await supabase.from("dish_events").insert(event);
    if (error && import.meta.env.DEV) {
      console.warn("Analytics event insert failed", error);
    }
  } catch (error) {
    if (import.meta.env.DEV) console.warn("Analytics event insert failed", error);
  }
}

/** Record one menu open per restaurant for the lifetime of this browser tab. */
export function trackMenuViewOnce(params: { restaurantId: string; isPreview: boolean }): void {
  if (params.isPreview) return;

  const storageKey = `${MENU_VIEW_KEY_PREFIX}${params.restaurantId}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    // Mark before dispatch so React remounts and failed inserts do not inflate traffic.
    sessionStorage.setItem(storageKey, "1");
  } catch {
    if (fallbackMenuViews.has(params.restaurantId)) return;
    fallbackMenuViews.add(params.restaurantId);
  }

  void trackEvent({
    restaurantId: params.restaurantId,
    eventType: "menu_view",
    isPreview: false,
  });
}
