import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { WEEKDAY_SHORT_NAMES, type WeeklyBusinessDay } from "@/lib/business-hours";

interface BusinessHoursDetailsDialogProps {
  days: readonly WeeklyBusinessDay[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BusinessHoursDetailsDialog({ days, open, onOpenChange }: BusinessHoursDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Horarios</DialogTitle>
          <DialogDescription>Horario semanal del restaurante.</DialogDescription>
        </DialogHeader>
        <div className="divide-y rounded-md border">
          {[...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((day) => (
            <div key={day.dayOfWeek} className="flex items-start justify-between gap-4 px-3 py-2.5 text-sm">
              <span className="font-medium">{WEEKDAY_SHORT_NAMES[day.dayOfWeek]}</span>
              <span className="text-right text-muted-foreground">
                {day.isClosed
                  ? "Cerrado"
                  : day.intervals.map((interval) => `${interval.openTime}–${interval.closeTime}`).join(", ")}
              </span>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
