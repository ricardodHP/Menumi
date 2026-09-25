import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WEEKDAY_SHORT_NAMES, type IsoWeekday, type WeeklyBusinessDay } from "@/lib/business-hours";

interface BusinessHoursEditorProps {
  value: readonly WeeklyBusinessDay[];
  onChange: (days: WeeklyBusinessDay[]) => void;
}

const weekdays = [1, 2, 3, 4, 5, 6, 7] as const;

export default function BusinessHoursEditor({ value, onChange }: BusinessHoursEditorProps) {
  const updateDay = (dayOfWeek: IsoWeekday, update: (day: WeeklyBusinessDay) => WeeklyBusinessDay) => {
    onChange(value.map((day) => day.dayOfWeek === dayOfWeek ? update(day) : { ...day }));
  };

  const copyFromMonday = (targetDays: readonly IsoWeekday[]) => {
    const monday = value.find((day) => day.dayOfWeek === 1);
    if (!monday) return;
    onChange(value.map((day) => targetDays.includes(day.dayOfWeek)
      ? { ...day, isClosed: monday.isClosed, intervals: monday.intervals.map((interval) => ({ ...interval })) }
      : { ...day }));
  };

  return (
    <section className="space-y-4" aria-labelledby="business-hours-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id="business-hours-title" className="font-semibold">Horarios semanales</h3>
          <p className="text-sm text-muted-foreground">Puedes agregar varios turnos y cerrar después de medianoche.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => copyFromMonday(weekdays.slice(1))}>
            Copiar lunes a todos
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => copyFromMonday([2, 3, 4, 5])}>
            Copiar a lun–vie
          </Button>
        </div>
      </div>

      <div className="divide-y rounded-lg border">
        {value.map((day) => (
          <div key={day.dayOfWeek} className="grid gap-3 p-3 sm:grid-cols-[6rem_6rem_minmax(0,1fr)] sm:items-start">
            <span className="pt-2 text-sm font-medium">{WEEKDAY_SHORT_NAMES[day.dayOfWeek]}</span>
            <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <Switch
                checked={day.isClosed}
                aria-label={`${day.isClosed ? "Abrir" : "Cerrar"} ${WEEKDAY_SHORT_NAMES[day.dayOfWeek]}`}
                onCheckedChange={(isClosed) => updateDay(day.dayOfWeek, (current) => ({
                  ...current,
                  isClosed,
                  intervals: isClosed ? [] : current.intervals.length ? current.intervals : [{ openTime: "09:00", closeTime: "17:00" }],
                }))}
              />
              Cerrado
            </label>
            <div className="space-y-2">
              {day.isClosed ? (
                <p className="pt-2 text-sm text-muted-foreground">Cerrado</p>
              ) : (
                <>
                  {day.intervals.map((interval, index) => (
                    <div key={`${day.dayOfWeek}-${index}`} className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`hours-${day.dayOfWeek}-${index}-open`}>Apertura {WEEKDAY_SHORT_NAMES[day.dayOfWeek]}</label>
                      <input
                        id={`hours-${day.dayOfWeek}-${index}-open`}
                        type="time"
                        value={interval.openTime}
                        onChange={(event) => updateDay(day.dayOfWeek, (current) => ({
                          ...current,
                          intervals: current.intervals.map((entry, entryIndex) => entryIndex === index ? { ...entry, openTime: event.target.value } : entry),
                        }))}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      />
                      <span aria-hidden>→</span>
                      <label className="sr-only" htmlFor={`hours-${day.dayOfWeek}-${index}-close`}>Cierre {WEEKDAY_SHORT_NAMES[day.dayOfWeek]}</label>
                      <input
                        id={`hours-${day.dayOfWeek}-${index}-close`}
                        type="time"
                        value={interval.closeTime}
                        onChange={(event) => updateDay(day.dayOfWeek, (current) => ({
                          ...current,
                          intervals: current.intervals.map((entry, entryIndex) => entryIndex === index ? { ...entry, closeTime: event.target.value } : entry),
                        }))}
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Eliminar intervalo ${index + 1} de ${WEEKDAY_SHORT_NAMES[day.dayOfWeek]}`}
                        onClick={() => updateDay(day.dayOfWeek, (current) => ({
                          ...current,
                          intervals: current.intervals.filter((_, entryIndex) => entryIndex !== index),
                          isClosed: current.intervals.length === 1,
                        }))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    onClick={() => updateDay(day.dayOfWeek, (current) => ({
                      ...current,
                      intervals: [...current.intervals, { openTime: "09:00", closeTime: "17:00" }],
                    }))}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Agregar intervalo
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
