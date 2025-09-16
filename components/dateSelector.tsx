// DateSelector.tsx
"use client"

import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
type DateSelectorProps = {
  value?: Date
  onChange?: (date: Date) => void
}

export function DateSelector({ value, onChange }: DateSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [time, setTime] = React.useState("10:30:00")

  const today = new Date()
  today.setHours(0, 0, 0, 0) // strip time

  const handleDateChange = (date?: Date) => {
    if (!date) return
    const [h, m, s] = time.split(":").map(Number)
    const withTime = new Date(date)
    withTime.setHours(h, m, s || 0)
    onChange?.(withTime)
    setOpen(false)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTime(newTime)

    if (value) {
      const [h, m, s] = newTime.split(":").map(Number)
      const withTime = new Date(value)
      withTime.setHours(h, m, s || 0)

      // block past times on today
      const now = new Date()
      if (withTime < now) return

      onChange?.(withTime)
    }
  }

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-3">
        <Label htmlFor="date-picker" className="px-1">
          Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="w-32 justify-between font-normal"
            >
              {value ? value.toLocaleDateString() : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              captionLayout="dropdown"
              // disable all dates before today
              disabled={(date) => date < today}
              onSelect={handleDateChange}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        <Label htmlFor="time-picker" className="px-1">
          Time
        </Label>
        <Input
          type="time"
          id="time-picker"
          step="1"
          value={time}
          min={
            value && value.toDateString() === new Date().toDateString()
              ? new Date().toTimeString().slice(0, 8) // current time as min
              : undefined
          }
          onChange={handleTimeChange}
          className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  )
}
