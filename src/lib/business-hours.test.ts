import { describe, expect, it } from "vitest";
import {
  formatBusinessHoursSummary,
  mapBusinessHoursRecords,
  normalizeBusinessHoursTime,
  serializeWeeklyBusinessHours,
  validateWeeklyBusinessHours,
  type WeeklyBusinessDay,
} from "./business-hours";

const closedWeek: WeeklyBusinessDay[] = [
  { dayOfWeek: 1, isClosed: true, intervals: [] },
  { dayOfWeek: 2, isClosed: true, intervals: [] },
  { dayOfWeek: 3, isClosed: true, intervals: [] },
  { dayOfWeek: 4, isClosed: true, intervals: [] },
  { dayOfWeek: 5, isClosed: true, intervals: [] },
  { dayOfWeek: 6, isClosed: true, intervals: [] },
  { dayOfWeek: 7, isClosed: true, intervals: [] },
];

function openWeek(intervals = [{ openTime: "12:00", closeTime: "22:00" }]): WeeklyBusinessDay[] {
  return closedWeek.map((day) => ({ ...day, isClosed: false, intervals }));
}

describe("weekly business hours", () => {
  it("treats no structured rows as an unconfigured legacy schedule", () => {
    expect(mapBusinessHoursRecords([], [])).toBeNull();
  });

  it("maps seven days and ordered intervals from database records", () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      id: `day-${index + 1}`,
      day_of_week: index + 1,
      is_closed: index !== 1,
    }));
    const intervals = [{
      business_day_id: "day-2",
      position: 0,
      open_time: "18:00:00",
      close_time: "02:00:00",
    }];

    expect(mapBusinessHoursRecords(days, intervals)?.[1]).toEqual({
      dayOfWeek: 2,
      isClosed: false,
      intervals: [{ openTime: "18:00", closeTime: "02:00" }],
    });
  });

  it("rejects a partial structured week rather than silently using legacy text", () => {
    expect(() => mapBusinessHoursRecords([
      { id: "monday", day_of_week: 1, is_closed: true },
    ], [])).toThrow("incomplete structured business hours");
  });

  it("accepts a complete week with one interval per open day", () => {
    expect(validateWeeklyBusinessHours(openWeek())).toBeNull();
  });

  it("accepts split intervals that do not overlap", () => {
    const week = openWeek();
    week[2].intervals = [
      { openTime: "09:00", closeTime: "14:00" },
      { openTime: "17:00", closeTime: "22:00" },
    ];

    expect(validateWeeklyBusinessHours(week)).toBeNull();
  });

  it("rejects a missing day, a closed day with intervals, and an open day without intervals", () => {
    expect(validateWeeklyBusinessHours(closedWeek.slice(0, 6))).toBe("week-must-have-seven-days");

    const closedWithInterval = closedWeek.map((day) => ({ ...day, intervals: [...day.intervals] }));
    closedWithInterval[0].intervals = [{ openTime: "12:00", closeTime: "22:00" }];
    expect(validateWeeklyBusinessHours(closedWithInterval)).toBe("closed-day-has-intervals");

    const openWithoutInterval = closedWeek.map((day) => ({ ...day, intervals: [...day.intervals] }));
    openWithoutInterval[0].isClosed = false;
    expect(validateWeeklyBusinessHours(openWithoutInterval)).toBe("open-day-needs-interval");
  });

  it("rejects invalid, empty, and zero-length time ranges", () => {
    const invalidTime = openWeek();
    invalidTime[0].intervals = [{ openTime: "", closeTime: "22:00" }];
    expect(validateWeeklyBusinessHours(invalidTime)).toBe("invalid-time");

    const zeroLength = openWeek();
    zeroLength[0].intervals = [{ openTime: "12:00", closeTime: "12:00" }];
    expect(validateWeeklyBusinessHours(zeroLength)).toBe("zero-length-interval");
  });

  it("rejects overlapping intervals on the same day", () => {
    const week = openWeek();
    week[0].intervals = [
      { openTime: "09:00", closeTime: "14:00" },
      { openTime: "13:00", closeTime: "17:00" },
    ];

    expect(validateWeeklyBusinessHours(week)).toBe("overlapping-intervals");
  });

  it("rejects an overnight interval overlapping the following day", () => {
    const week = closedWeek.map((day) => ({ ...day, intervals: [...day.intervals] }));
    week[0] = { dayOfWeek: 1, isClosed: false, intervals: [{ openTime: "18:00", closeTime: "02:00" }] };
    week[1] = { dayOfWeek: 2, isClosed: false, intervals: [{ openTime: "01:00", closeTime: "04:00" }] };

    expect(validateWeeklyBusinessHours(week)).toBe("overlapping-intervals");
  });

  it("allows overnight intervals that touch at midnight without overlapping", () => {
    const week = closedWeek.map((day) => ({ ...day, intervals: [...day.intervals] }));
    week[0] = { dayOfWeek: 1, isClosed: false, intervals: [{ openTime: "18:00", closeTime: "02:00" }] };
    week[1] = { dayOfWeek: 2, isClosed: false, intervals: [{ openTime: "02:00", closeTime: "04:00" }] };

    expect(validateWeeklyBusinessHours(week)).toBeNull();
  });

  it("detects an overnight overlap across Sunday and Monday", () => {
    const week = closedWeek.map((day) => ({ ...day, intervals: [...day.intervals] }));
    week[6] = { dayOfWeek: 7, isClosed: false, intervals: [{ openTime: "22:00", closeTime: "03:00" }] };
    week[0] = { dayOfWeek: 1, isClosed: false, intervals: [{ openTime: "02:00", closeTime: "05:00" }] };

    expect(validateWeeklyBusinessHours(week)).toBe("overlapping-intervals");
  });

  it("formats a uniform weekly schedule compactly and sends irregular weeks to details", () => {
    expect(formatBusinessHoursSummary(openWeek())).toEqual({
      text: "Lun–Dom 12:00–22:00",
      showDetails: false,
    });

    const irregular = openWeek();
    irregular[2].intervals = [
      { openTime: "09:00", closeTime: "14:00" },
      { openTime: "17:00", closeTime: "22:00" },
    ];
    expect(formatBusinessHoursSummary(irregular)).toEqual({
      text: "Ver horarios",
      showDetails: true,
    });
  });

  it("serializes all seven ISO weekdays and every split interval for the RPC", () => {
    const week = openWeek();
    week[2].intervals = [
      { openTime: "09:00", closeTime: "14:00" },
      { openTime: "17:00", closeTime: "22:00" },
    ];
    week[0].isClosed = true;
    week[0].intervals = [];

    expect(serializeWeeklyBusinessHours([...week].reverse())).toEqual({
      days: [
        { day_of_week: 1, is_closed: true, intervals: [] },
        { day_of_week: 2, is_closed: false, intervals: [{ open_time: "12:00", close_time: "22:00" }] },
        {
          day_of_week: 3,
          is_closed: false,
          intervals: [
            { open_time: "09:00", close_time: "14:00" },
            { open_time: "17:00", close_time: "22:00" },
          ],
        },
        { day_of_week: 4, is_closed: false, intervals: [{ open_time: "12:00", close_time: "22:00" }] },
        { day_of_week: 5, is_closed: false, intervals: [{ open_time: "12:00", close_time: "22:00" }] },
        { day_of_week: 6, is_closed: false, intervals: [{ open_time: "12:00", close_time: "22:00" }] },
        { day_of_week: 7, is_closed: false, intervals: [{ open_time: "12:00", close_time: "22:00" }] },
      ],
    });
  });

  it("normalizes PostgreSQL time output for time inputs", () => {
    expect(normalizeBusinessHoursTime("02:00:00")).toBe("02:00");
    expect(normalizeBusinessHoursTime("18:45")).toBe("18:45");
    expect(normalizeBusinessHoursTime("18:45:01")).toBe("18:45:01");
  });
});
