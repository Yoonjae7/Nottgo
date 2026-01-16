import { format } from "date-fns"
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{buggyStops[stopIndex]}</CardTitle>
        <div className="flex flex-col">
          <CardDescription className="text-sm">
            {scheduleType === "Weekday"
              ? `Next arrival: ${nextArrival || "No more buggies today"}`
              : "No service on weekends"}
          </CardDescription>
          <Badge variant="outline" className="mt-2 self-start">
            {scheduleType} Schedule {isFriday && "(Friday)"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-left text-xs text-gray-500 mb-3">
          Current time: {format(currentTime, "HH:mm:ss")}
        </div>
        {scheduleType === "Weekday" ? (
          <>
            {isFriday && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No service between 12:30 PM - 2:00 PM due to Friday Prayer</AlertDescription>
              </Alert>
            )}
            <h3 className="font-semibold text-sm mb-2">Upcoming arrivals:</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {arrivalTimes.map((time) => {
                const passed = isTimePassed(time)
                const isNext = time === nextArrival
                let bgColor = "bg-gray-100"
                if (passed) {
                  bgColor = "bg-red-200"
                } else if (isNext) {
                  bgColor = "bg-yellow-200"
                }
                return (
                  <div
                    key={time}
                    className={`${bgColor} rounded p-1 text-center relative`}
                  >
                    {time}
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Buggy service is not available on weekends.</p>
        )}
      </CardContent>
    </Card>
  )
}
