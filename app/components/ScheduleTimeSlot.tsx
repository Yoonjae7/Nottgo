import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import type { ScheduleSlotVisual } from "@/lib/scheduleSlotVisual"

const VISUAL_CLASSES: Record<Exclude<ScheduleSlotVisual, "grace">, string> = {
  passed: "bg-red-100 text-red-600 opacity-60 dark:bg-red-950/40 dark:text-red-300",
  next: "ring-2 ring-primary bg-primary/10",
  default: "bg-gray-100 text-foreground dark:bg-muted/60",
}

interface ScheduleTimeSlotProps {
  visual: ScheduleSlotVisual
  children: ReactNode
  className?: string
  /** Bus grid uses non-tabular numbers; buggy and table cells use tabular for alignment. */
  tabularNums?: boolean
  innerClassName?: string
}

export function ScheduleTimeSlot({
  visual,
  children,
  className,
  tabularNums = true,
  innerClassName,
}: ScheduleTimeSlotProps) {
  const num = tabularNums ? "tabular-nums" : ""

  if (visual === "grace") {
    return (
      <div className={cn("schedule-slot-grace-outer", className)}>
        <div
          className={cn(
            "schedule-slot-grace-inner",
            VISUAL_CLASSES.default,
            num,
            innerClassName,
          )}
        >
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("relative rounded p-2 text-center", num, VISUAL_CLASSES[visual], className)}>
      {children}
    </div>
  )
}
