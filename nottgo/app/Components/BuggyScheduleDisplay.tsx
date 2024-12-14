import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BuggyScheduleDisplayProps {
  selectedStop: string
  nextArrival: string | null
  arrivalTimes: string[]
  scheduleType: 'Weekday' | 'Weekend'
}

export default function BuggyScheduleDisplay({ selectedStop, nextArrival, arrivalTimes, scheduleType }: BuggyScheduleDisplayProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{selectedStop}</CardTitle>
        <div className="flex flex-col">
          <CardDescription className="text-sm">
            Next arrival: {nextArrival || 'No more buggies today'}
          </CardDescription>
          <Badge variant="outline" className="mt-2 self-start">
            {scheduleType} Schedule
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <h3 className="font-semibold text-sm mb-2">Upcoming arrivals:</h3>
        <div className="grid grid-cols-3 gap-2 text-sm">
          {arrivalTimes.map((time) => (
            <div key={time} className="bg-gray-100 rounded p-1 text-center">
              {time}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

