import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { busDestinations } from "@/lib/data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { ScheduleType, ScheduleEntry } from "@/lib/data"

interface BusScheduleDisplayProps {
  destination: string
  outSchedule: ScheduleEntry[]
  inSchedule: ScheduleEntry[]
  nextDepartureOut: string | null
  nextDepartureIn: string | null
  notes: string
  scheduleType: ScheduleType
  isManualOverride: boolean
  onScheduleTypeChange: (type: ScheduleType | null) => void
  currentTime: Date
}

export default function BusScheduleDisplay({
  destination,
  outSchedule,
  inSchedule,
  nextDepartureOut,
  nextDepartureIn,
  notes,
  scheduleType,
  isManualOverride,
  onScheduleTypeChange,
  currentTime,
}: BusScheduleDisplayProps) {
  const [activeTab, setActiveTab] = useState<string>("outbound")
  const destinationName = busDestinations.find((d) => d.id === destination)?.name || destination

  // Check if a time has passed
  const isTimePassed = (timeString: string): boolean => {
    const [hours, minutes] = timeString.split(":").map(Number)
    const now = new Date(currentTime)
    const scheduleTime = new Date(now)
    scheduleTime.setHours(hours, minutes, 0, 0)
    
    // Handle times that are past midnight (like 00:00) - treat as next day
    if (hours === 0 || (hours < 6 && now.getHours() >= 20)) {
      scheduleTime.setDate(scheduleTime.getDate() + 1)
    }
    
    return scheduleTime < now
  }

  const scheduleTypeLabel = {
    weekday: "Weekday (Mon-Thu)",
    friday: "Friday",
    weekend: "Weekend/Public Holiday",
  }[scheduleType]

  // Parse notes to get direction-specific notes
  const getDirectionNote = (direction: "outbound" | "inbound") => {
    // Handle routes with Outbound/Inbound split
    if (notes.includes("Outbound -") && notes.includes("Inbound -")) {
      const parts = notes.split("Inbound -")
      let outboundNote = parts[0].replace("Outbound -", "").trim()
      // Remove route prefix if present
      outboundNote = outboundNote.replace(/^Route #[A-Z0-9]+:\s*/, "").trim()
      const inboundNote = parts[1]?.trim() || ""
      return direction === "outbound" ? outboundNote : inboundNote
    }
    return notes
  }

  // Only show badge for vans, not for buses or regular services
  const getServiceBadge = (serviceType: string) => {
    if (serviceType === "van") {
      return (
        <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px]">
          Van
        </Badge>
      )
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Campus to {destinationName}</CardTitle>
        <div className="flex flex-col">
          <Badge variant="outline" className="mt-2 self-start">
            {scheduleTypeLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-left text-xs text-gray-500 mb-3">
          Current time: {format(currentTime, "HH:mm:ss")}
        </div>
        <Tabs defaultValue="outbound" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outbound">From Campus</TabsTrigger>
            <TabsTrigger value="inbound">To Campus</TabsTrigger>
          </TabsList>
          <TabsContent value="outbound">
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-2">
                Next departure to {destinationName}: <span className="font-semibold">{nextDepartureOut || "No more departures today"}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm">
              {outSchedule.length > 0 ? (
                outSchedule.map((entry) => {
                  const passed = isTimePassed(entry.time)
                  const isNext = entry.time === nextDepartureOut
                  let bgColor = "bg-gray-100"
                  if (passed) {
                    bgColor = "bg-red-200"
                  } else if (isNext) {
                    bgColor = "bg-yellow-200"
                  }
                  return (
                    <div
                      key={entry.time}
                      className={`${bgColor} rounded p-1 sm:p-2 text-center relative`}
                    >
                      {entry.time}
                      {getServiceBadge(entry.serviceType)}
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full text-center text-gray-500">No service</div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="inbound">
            <div className="mb-3">
              <p className="text-sm text-gray-600 mb-2">
                Next departure from {destinationName}: <span className="font-semibold">{nextDepartureIn || "No more departures today"}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm">
              {inSchedule.length > 0 ? (
                inSchedule.map((entry) => {
                  const passed = isTimePassed(entry.time)
                  const isNext = entry.time === nextDepartureIn
                  let bgColor = "bg-gray-100"
                  if (passed) {
                    bgColor = "bg-red-200"
                  } else if (isNext) {
                    bgColor = "bg-yellow-200"
                  }
                  return (
                    <div
                      key={entry.time}
                      className={`${bgColor} rounded p-1 sm:p-2 text-center relative`}
                    >
                      {entry.time}
                      {getServiceBadge(entry.serviceType)}
                    </div>
                  )
                })
              ) : (
                <div className="col-span-full text-center text-gray-500">No service</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        {notes && (
          <div className="mt-4 text-xs sm:text-sm text-gray-600">
            <h3 className="font-semibold mb-1">Notes:</h3>
            <p>{getDirectionNote(activeTab as "outbound" | "inbound")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
