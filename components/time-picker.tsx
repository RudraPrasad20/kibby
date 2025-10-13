"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimeSlotPickerProps {
  value?: string;
  onChange: (val: string) => void;
  slots: string[]; // e.g. ["09:00", "10:00", "11:00"]
}

export function TimeSlotPicker({ value, onChange, slots }: TimeSlotPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((slot) => (
        <Button
          key={slot}
          variant={value === slot ? "default" : "outline"}
          onClick={() => onChange(slot)}
          className={cn("text-sm")}
        >
          {slot}
        </Button>
      ))}
    </div>
  );
}
