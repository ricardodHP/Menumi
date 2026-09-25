import { supabase } from "@/integrations/supabase/client";
import {
  mapBusinessHoursRecords,
  serializeWeeklyBusinessHours,
  type WeeklyBusinessDay,
} from "@/lib/business-hours";

/** Returns null only when no structured schedule has been configured. */
export async function loadRestaurantBusinessHours(
  restaurantId: string,
): Promise<WeeklyBusinessDay[] | null> {
  const dayResult = await supabase
    .from("restaurant_business_days")
    .select("id, day_of_week, is_closed")
    .eq("restaurant_id", restaurantId)
    .order("day_of_week", { ascending: true });
  if (dayResult.error) throw new Error(dayResult.error.message);
  const days = dayResult.data ?? [];
  if (days.length === 0) return null;

  const intervalResult = await supabase
    .from("restaurant_business_hour_intervals")
    .select("business_day_id, position, open_time, close_time")
    .in("business_day_id", days.map((day) => day.id))
    .order("position", { ascending: true });
  if (intervalResult.error) throw new Error(intervalResult.error.message);

  return mapBusinessHoursRecords(days, intervalResult.data ?? []);
}

/** Replaces the complete week in one database transaction via the RPC. */
export async function saveRestaurantBusinessHours(
  restaurantId: string,
  days: readonly WeeklyBusinessDay[],
): Promise<void> {
  const { error } = await supabase.rpc("save_restaurant_business_hours", {
    p_restaurant_id: restaurantId,
    p_week: serializeWeeklyBusinessHours(days),
  });
  if (error) throw new Error(error.message);
}
