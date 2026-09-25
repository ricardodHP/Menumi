import type { Database } from "@/integrations/supabase/types";

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface BusinessHoursInterval {
  openTime: string;
  closeTime: string;
}

export interface WeeklyBusinessDay {
  dayOfWeek: IsoWeekday;
  isClosed: boolean;
  intervals: BusinessHoursInterval[];
}

export type SerializedBusinessHoursWeek =
  Database["public"]["Functions"]["save_restaurant_business_hours"]["Args"]["p_week"];

export type BusinessHoursDayRecord = Pick<
  Database["public"]["Tables"]["restaurant_business_days"]["Row"],
  "id" | "day_of_week" | "is_closed"
>;

export type BusinessHoursIntervalRecord = Pick<
  Database["public"]["Tables"]["restaurant_business_hour_intervals"]["Row"],
  "business_day_id" | "position" | "open_time" | "close_time"
>;

export type BusinessHoursValidationError =
  | "week-must-have-seven-days"
  | "invalid-day"
  | "closed-day-has-intervals"
  | "open-day-needs-interval"
  | "invalid-time"
  | "zero-length-interval"
  | "overlapping-intervals";

export const WEEKDAY_SHORT_NAMES: Record<IsoWeekday, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function normalizeBusinessHoursTime(value: string): string {
  const match = /^(\d{2}:\d{2})(?::00(?:\.0+)?)?$/.exec(value);
  return match?.[1] ?? value;
}

export function serializeWeeklyBusinessHours(
  inputDays: readonly WeeklyBusinessDay[],
): SerializedBusinessHoursWeek {
  return {
    days: [...inputDays]
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((day) => ({
        day_of_week: day.dayOfWeek,
        is_closed: day.isClosed,
        intervals: day.intervals.map((interval) => ({
          open_time: interval.openTime,
          close_time: interval.closeTime,
        })),
      })),
  };
}

export function mapBusinessHoursRecords(
  dayRecords: readonly BusinessHoursDayRecord[],
  intervalRecords: readonly BusinessHoursIntervalRecord[],
): WeeklyBusinessDay[] | null {
  if (dayRecords.length === 0) {
    if (intervalRecords.length > 0) throw new Error("business hour intervals have no parent days");
    return null;
  }
  if (dayRecords.length !== 7) throw new Error("incomplete structured business hours");

  const intervalsByDay = new Map<string, BusinessHoursIntervalRecord[]>();
  const knownDayIds = new Set(dayRecords.map((day) => day.id));
  for (const interval of intervalRecords) {
    if (!knownDayIds.has(interval.business_day_id)) {
      throw new Error("business hour interval references an unknown day");
    }
    const rows = intervalsByDay.get(interval.business_day_id) ?? [];
    rows.push(interval);
    intervalsByDay.set(interval.business_day_id, rows);
  }

  const days = dayRecords.map((day) => {
    if (!isIsoWeekday(day.day_of_week)) {
      throw new Error("invalid structured business hours weekday");
    }
    return {
      dayOfWeek: day.day_of_week,
      isClosed: day.is_closed,
      intervals: (intervalsByDay.get(day.id) ?? [])
        .sort((a, b) => a.position - b.position)
        .map((interval) => ({
          openTime: normalizeBusinessHoursTime(interval.open_time),
          closeTime: normalizeBusinessHoursTime(interval.close_time),
        })),
    };
  }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  if (validateWeeklyBusinessHours(days)) throw new Error("invalid structured business hours");
  return days;
}

function isIsoWeekday(value: number): value is IsoWeekday {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

interface MinuteRange {
  start: number;
  end: number;
}

function toMinuteOfDay(value: string): number | null {
  if (!TIME_PATTERN.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function validateWeeklyBusinessHours(
  days: readonly WeeklyBusinessDay[],
): BusinessHoursValidationError | null {
  if (days.length !== 7) return "week-must-have-seven-days";

  const seenDays = new Set<number>();
  for (const day of days) {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 1 || day.dayOfWeek > 7) {
      return "invalid-day";
    }
    if (seenDays.has(day.dayOfWeek)) return "week-must-have-seven-days";
    seenDays.add(day.dayOfWeek);
  }
  if (seenDays.size !== 7) return "week-must-have-seven-days";

  const ranges: MinuteRange[] = [];
  for (const day of days) {
    if (day.isClosed) {
      if (day.intervals.length > 0) return "closed-day-has-intervals";
      continue;
    }
    if (day.intervals.length === 0) return "open-day-needs-interval";

    for (const interval of day.intervals) {
      const open = toMinuteOfDay(interval.openTime);
      const close = toMinuteOfDay(interval.closeTime);
      if (open === null || close === null) return "invalid-time";
      if (open === close) return "zero-length-interval";

      const start = (day.dayOfWeek - 1) * MINUTES_PER_DAY + open;
      const end = (day.dayOfWeek - 1) * MINUTES_PER_DAY + close + (close < open ? MINUTES_PER_DAY : 0);
      ranges.push({ start, end });
    }
  }

  for (let leftIndex = 0; leftIndex < ranges.length; leftIndex += 1) {
    const left = ranges[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < ranges.length; rightIndex += 1) {
      const right = ranges[rightIndex];
      for (const weekOffset of [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK]) {
        const shiftedStart = right.start + weekOffset;
        const shiftedEnd = right.end + weekOffset;
        if (left.start < shiftedEnd && shiftedStart < left.end) {
          return "overlapping-intervals";
        }
      }
    }
  }

  return null;
}

function formatIntervals(intervals: readonly BusinessHoursInterval[]): string {
  return intervals
    .map((interval) => `${interval.openTime}–${interval.closeTime}`)
    .join(" y ");
}

export function formatBusinessHoursSummary(
  inputDays: readonly WeeklyBusinessDay[],
): { text: string; showDetails: boolean } {
  if (validateWeeklyBusinessHours(inputDays)) {
    return { text: "Ver horarios", showDetails: true };
  }

  const days = [...inputDays].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const openDays = days.filter((day) => !day.isClosed);
  if (openDays.length === 0) {
    return { text: "Cerrado toda la semana", showDetails: false };
  }

  const sharedIntervals = JSON.stringify(openDays[0].intervals);
  const sameIntervals = openDays.every((day) => JSON.stringify(day.intervals) === sharedIntervals);
  if (!sameIntervals) return { text: "Ver horarios", showDetails: true };

  const firstIndex = days.findIndex((day) => !day.isClosed);
  const lastIndex = days.map((day) => !day.isClosed).lastIndexOf(true);
  const isOneLinearRun = lastIndex - firstIndex + 1 === openDays.length;
  if (openDays.length !== 7 && !isOneLinearRun) {
    return { text: "Ver horarios", showDetails: true };
  }

  const range = openDays.length === 7
    ? "Lun–Dom"
    : firstIndex === lastIndex
      ? WEEKDAY_SHORT_NAMES[days[firstIndex].dayOfWeek]
      : `${WEEKDAY_SHORT_NAMES[days[firstIndex].dayOfWeek]}–${WEEKDAY_SHORT_NAMES[days[lastIndex].dayOfWeek]}`;
  return {
    text: `${range} ${formatIntervals(openDays[0].intervals)}`,
    showDetails: false,
  };
}
