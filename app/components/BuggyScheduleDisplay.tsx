import { format, parse } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { buggyStops } from "@/lib/data"

interface BuggyScheduleDisplayProps {
  nextArrival: string | null
  arrivalTimes: string[]
  scheduleType: "Weekday" | "Weekend"
  stopIndex: number
  isFriday: boolean
  currentTime: Date
}

export default function BuggyScheduleDisplay({
  nextArrival,
  arrivalTimes,
  scheduleType,
  stopIndex,
  isFriday,
  currentTime,
}: BuggyScheduleDisplayProps) {
  const stopName = buggyStops[stopIndex] ?? "Stop"

  const arrivalCountdownLabel = (() => {
    if (scheduleType !== "Weekday" || !nextArrival) return null
    const arrivalAt = parse(nextArrival, "HH:mm", currentTime)
    const diffMs = arrivalAt.getTime() - currentTime.getTime()
    if (diffMs <= 0) return "Soon"
    if (diffMs <= 60_000) return "Soon"
    const mins = Math.ceil(diffMs / 60_000)
    if (mins >= 60) {
      const hours = Math.max(1, Math.round(diffMs / 3_600_000))
      return hours === 1 ? "In 1 hour" : `In ${hours} hours`
    }
    return `In ${mins} minutes`
  })()

  const isTimePassed = (timeString: string): boolean => {
    const [hours, minutes] = timeString.split(":").map(Number)
    const now = new Date(currentTime)
    const scheduleTime = new Date(now)
    scheduleTime.setHours(hours, minutes, 0, 0)

    if (hours === 0 || (hours < 6 && now.getHours() >= 20)) {
      scheduleTime.setDate(scheduleTime.getDate() + 1)
    }

    return scheduleTime < now
  }

  const scheduleBadgeLabel =
    scheduleType === "Weekday"
      ? `${scheduleType} schedule${isFriday ? " (Friday)" : ""}`
      : `${scheduleType} schedule`

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Buggy · {stopName}</CardTitle>
        <div className="flex flex-col space-y-3">
          {scheduleType === "Weekday" ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <CardDescription className="text-base font-semibold shrink-0">
                  Next arrival:
                </CardDescription>
                <div className="text-2xl font-bold text-primary text-right tabular-nums">
                  {nextArrival || "No more buggies today"}
                </div>
              </div>
              {arrivalCountdownLabel !== null && (
                <div className="flex items-center justify-between border-t pt-2">
                  <CardDescription className="text-sm text-muted-foreground">Arrives:</CardDescription>
                  <div className="text-lg font-semibold text-primary tabular-nums" suppressHydrationWarning>
                    {arrivalCountdownLabel}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2">
                <CardDescription className="text-sm text-muted-foreground">Current time:</CardDescription>
                <div className="text-lg font-semibold text-foreground tabular-nums" suppressHydrationWarning>
                  {format(currentTime, "HH:mm:ss")}
                </div>
              </div>
              <Badge variant="outline" className="self-start">
                {scheduleBadgeLabel}
              </Badge>
            </>
          ) : (
            <>
              <CardDescription className="text-sm text-muted-foreground">
                Buggy service is not available on weekends.
              </CardDescription>
              <Badge variant="outline" className="self-start">
                {scheduleBadgeLabel}
              </Badge>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className={scheduleType === "Weekend" ? "hidden" : undefined}>
        {scheduleType === "Weekday" && (
          <>
            {isFriday && (
              <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-sm">
                  No service between 12:30 PM – 2:00 PM (Friday prayer).
                </AlertDescription>
              </Alert>
            )}
            <div>
              <h3 className="text-sm font-semibold mb-2">All arrivals today:</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 text-sm">
                {arrivalTimes.map((time) => {
                  const passed = isTimePassed(time)
                  const isNext = time === nextArrival
                  return (
                    <div
                      key={time}
                      className={`rounded p-2 text-center relative tabular-nums ${
                        passed
                          ? "bg-red-100 text-red-600 opacity-60 dark:bg-red-950/40 dark:text-red-300"
                          : isNext
                            ? "ring-2 ring-primary bg-primary/10"
                            : "bg-gray-100 dark:bg-muted/60"
                      }`}
                    >
                      {time}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
