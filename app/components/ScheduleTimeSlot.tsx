import { cn } from "@/lib/utils"
import type { ScheduleSlotVisual } from "@/lib/scheduleSlotVisual"
import type { ReactNode } from "react"

const passed =
  "bg-red-100 text-red-600 opacity-60 dark:bg-red-950/40 dark:text-red-300"
const next = "ring-2 ring-primary bg-primary/10"
const defaultBox = "bg-gray-100 text-foreground dark:bg-muted/60"

export function ScheduleTimeSlot({
  visual,
  children,
  className,
  tabularNums = true,
  innerClassName,
}: {
  visual: ScheduleSlotVisual
  children: ReactNode
  className?: string
  /** Match bus grid (no tabular) vs buggy; default on for time strings */
  tabularNums?: boolean
  innerClassName?: string
}) {
  const num = tabularNums ? "tabular-nums" : ""

  if (visual === "passed") {
    return (
      <div
        className={cn("relative rounded p-2 text-center", num, passed, className)}
      >
        {children}
      </div>
    )
  }
  if (visual === "next") {
    return (
      <div
        className={cn("relative rounded p-2 text-center", num, next, className)}
      >
        {children}
      </div>
    )
  }
  if (visual === "grace") {
    return (
      <div className={cn("schedule-slot-grace-outer", className)}>
        <div
          className={cn(
            "schedule-slot-grace-inner",
            defaultBox,
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
    <div
      className={cn(
        "relative rounded p-2 text-center",
        num,
        defaultBox,
        className,
      )}
    >
      {children}
    </div>
  )
}
