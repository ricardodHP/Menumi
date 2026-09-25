import { supabase } from "@/integrations/supabase/client";

export type EventType = "view" | "cart_add" | "category_view" | "whatsapp_clicked";

const ANALYTICS_SESSION_KEY = "culinary_feed_analytics_session:v1";
let fallbackSessionId: string | null = null;

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
}) {
  try {
    const event = {
      restaurant_id: params.restaurantId,
      dish_id: params.dishId ?? null,
      category_id: params.categoryId ?? null,
      event_type: params.eventType,
      ...(params.eventType === "whatsapp_clicked" ? { session_id: getAnonymousSessionId() } : {}),
    };
    await supabase.from("dish_events").insert(event);
  } catch {
    // analytics is best-effort, never block UI
  }
}
