import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { busDestinations } from "@/lib/data"
import { Badge } from "@/components/ui/badge"
import { format, parse } from "date-fns"
import type { ScheduleType, ScheduleEntry } from "@/lib/data"
import { formatArrivalCountdown } from "@/lib/arrivalCountdown"
import { getBusSlotVisual } from "@/lib/scheduleSlotVisual"
import { ScheduleTimeSlot } from "./ScheduleTimeSlot"

interface BusScheduleDisplayProps {
  destination: string
  direction: "out" | "in"
  schedule: ScheduleEntry[]
  nextDeparture: string | null
  notes: string | { out: string; in: string }
  scheduleType: ScheduleType
  currentTime: Date
}

export default function BusScheduleDisplay({
  destination,
  direction,
  schedule,
  nextDeparture,
  notes,
  scheduleType,
  currentTime,
}: BusScheduleDisplayProps) {
  const destinationName = busDestinations.find((d) => d.id === destination)?.name || destination

  const scheduleTypeLabel = {
    weekday: "Weekday (Mon-Thu)",
    friday: "Friday",
    weekend: "Weekend (Sat-Sun)",
  }[scheduleType]

  const directionLabel = direction === "out" ? "From Campus" : "To Campus"
  const routeLabel = direction === "out" 
    ? `Campus → ${destinationName}` 
    : `${destinationName} → Campus`

  const arrivalCountdownLabel = (() => {
    if (!nextDeparture) return null
    const departureAt = parse(nextDeparture, "HH:mm", currentTime)
    return formatArrivalCountdown(departureAt.getTime() - currentTime.getTime())
  })()

  // Only show badge for vans, not for buses or regular services
  const getServiceBadge = (serviceType: string) => {
    if (serviceType === "van") {
      return (
        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px]">
          Van
        </Badge>
      )
    }
    if (serviceType === "bus") {
      return (
        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px]">
          Bus
        </Badge>
      )
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{routeLabel}</CardTitle>
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <CardDescription className="text-base font-semibold">
              Next Departure: 
            </CardDescription>
            <div className="text-2xl font-bold text-primary">
              {nextDeparture || "No more departures today"}
            </div>
          </div>
          {arrivalCountdownLabel !== null && (
            <div className="flex items-center justify-between border-t pt-2">
              <CardDescription className="text-sm text-gray-600">
                Arrives:
              </CardDescription>
              <div className="text-lg font-semibold text-primary" suppressHydrationWarning>
                {arrivalCountdownLabel}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2">
            <CardDescription className="text-sm text-gray-600">
              Current Time: 
            </CardDescription>
            <div className="text-lg font-semibold text-gray-700" suppressHydrationWarning>
              {format(currentTime, "HH:mm:ss")}
            </div>
          </div>
          <Badge variant="outline" className="self-start">
            {scheduleTypeLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">All {directionLabel} Departures:</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 text-sm">
            {schedule.length > 0 ? (
              schedule.map((entry) => {
                const visual = getBusSlotVisual(entry.time, nextDeparture, currentTime)
                return (
                  <ScheduleTimeSlot key={entry.time} visual={visual} tabularNums={false}>
                    {entry.time}
                    {getServiceBadge(entry.serviceType)}
                  </ScheduleTimeSlot>
                )
              })
            ) : (
              <div className="col-span-full text-center text-gray-500">No service</div>
            )}
          </div>
        </div>
        {notes && (
          <div className="mt-4 text-xs sm:text-sm text-gray-600">
            <h3 className="font-semibold mb-1">Notes:</h3>
            <p>{typeof notes === "string" ? notes : notes[direction]}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
