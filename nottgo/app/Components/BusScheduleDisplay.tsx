import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { busDestinations } from '@/lib/data'
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface BusScheduleDisplayProps {
  destination: string
  outSchedule: string[]
  inSchedule: string[]
  nextDepartureOut: string | null
  nextDepartureIn: string | null
  notes: string
  scheduleType: 'Weekday' | 'Weekend'
}

export default function BusScheduleDisplay({ 
  destination, 
  outSchedule, 
  inSchedule, 
  nextDepartureOut, 
  nextDepartureIn,
  notes,
  scheduleType
}: BusScheduleDisplayProps) {
  const destinationName = busDestinations.find(d => d.id === destination)?.name || destination;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Campus to {destinationName}</CardTitle>
        <div className="flex flex-col">
          <CardDescription className="text-sm">
            Next departure (Out): {nextDepartureOut || 'No more departures today'}
          </CardDescription>
          <CardDescription className="text-sm">
            Next departure (In): {nextDepartureIn || 'No more departures today'}
          </CardDescription>
          <Badge variant="outline" className="mt-2 self-start">
            {scheduleType} Schedule
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="outbound" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outbound">Outbound</TabsTrigger>
            <TabsTrigger value="inbound">Inbound</TabsTrigger>
          </TabsList>
          <TabsContent value="outbound">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm">
              {outSchedule.length > 0 ? (
                outSchedule.map((time) => (
                  <div key={time} className="bg-gray-100 rounded p-1 sm:p-2 text-center">
                    {time}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500">No service</div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="inbound">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 text-xs sm:text-sm">
              {inSchedule.length > 0 ? (
                inSchedule.map((time) => (
                  <div key={time} className="bg-gray-100 rounded p-1 sm:p-2 text-center">
                    {time}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center text-gray-500">No service</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
        {notes && (
          <div className="mt-4 text-xs sm:text-sm text-gray-600">
            <h3 className="font-semibold mb-1">Notes:</h3>
            <p>{notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

