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
}

export default function BuggyScheduleDisplay({
  nextArrival,
  arrivalTimes,
  scheduleType,
  stopIndex,
  isFriday,
}: BuggyScheduleDisplayProps) {
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
              {arrivalTimes.map((time) => (
                <div key={time} className="bg-gray-100 rounded p-1 text-center">
                  {time}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">Buggy service is not available on weekends.</p>
        )}
      </CardContent>
    </Card>
  )
}
