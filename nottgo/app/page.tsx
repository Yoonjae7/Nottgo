'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  buggyStops, 
  busDestinations, 
  getBuggyArrivalTimes, 
  getBuggyNextArrival, 
  getBusSchedule, 
  getBusNextDeparture,
  busSchedule
} from '@/lib/data'
import BuggyScheduleDisplay from './components/BuggyScheduleDisplay'
import BusScheduleDisplay from './components/BusScheduleDisplay'
import FullBuggySchedule from './components/FullBuggySchedule'
import FullBusSchedule from './components/FullBusSchedule'

export default function Home() {
  const [selectedStop, setSelectedStop] = useState<string>(buggyStops[0])
  const [selectedDestination, setSelectedDestination] = useState<string>(busDestinations[0].id)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isWeekend, setIsWeekend] = useState(false)
  const [isBuggy, setIsBuggy] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setIsWeekend(now.getDay() === 0 || now.getDay() === 6);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const currentDay = isWeekend ? 'weekend' : 'weekday'
  const buggyNextArrival = getBuggyNextArrival(selectedStop, currentTime, currentDay)
  const buggyArrivalTimes = getBuggyArrivalTimes(selectedStop, currentDay)
  
  const busOutSchedule = getBusSchedule(selectedDestination, currentDay, 'out')
  const busInSchedule = getBusSchedule(selectedDestination, currentDay, 'in')
  const busNextDepartureOut = getBusNextDeparture(selectedDestination, currentDay, 'out', currentTime)
  const busNextDepartureIn = getBusNextDeparture(selectedDestination, currentDay, 'in', currentTime)

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-2 sm:p-4 md:p-6 bg-gray-100">
      <Card className="w-full max-w-[95%] sm:max-w-md">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Campus Shuttle System</CardTitle>
          <CardDescription className="text-sm">
            Current time: {format(currentTime, 'HH:mm:ss')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-center space-x-2">
              <Button 
                onClick={() => setIsBuggy(true)} 
                variant={isBuggy ? "default" : "outline"}
                className="w-full sm:w-auto"
              >
                Buggy
              </Button>
              <Button 
                onClick={() => setIsBuggy(false)} 
                variant={!isBuggy ? "default" : "outline"}
                className="w-full sm:w-auto"
              >
                Bus
              </Button>
            </div>

            {isBuggy ? (
              <Select onValueChange={setSelectedStop} defaultValue={selectedStop}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a stop" />
                </SelectTrigger>
                <SelectContent>
                  {buggyStops.map((stop) => (
                    <SelectItem key={stop} value={stop}>{stop}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select onValueChange={setSelectedDestination} defaultValue={selectedDestination}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a destination" />
                </SelectTrigger>
                <SelectContent>
                  {busDestinations.map((destination) => (
                    <SelectItem key={destination.id} value={destination.id}>{destination.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {showFullSchedule ? (
              isBuggy ? (
                <FullBuggySchedule onClose={() => setShowFullSchedule(false)} />
              ) : (
                <FullBusSchedule 
                  destination={selectedDestination} 
                  onClose={() => setShowFullSchedule(false)} 
                />
              )
            ) : (
              <>
                {isBuggy ? (
                  <BuggyScheduleDisplay 
                    selectedStop={selectedStop} 
                    nextArrival={buggyNextArrival} 
                    arrivalTimes={buggyArrivalTimes}
                    scheduleType={isWeekend ? 'Weekend' : 'Weekday'}
                  />
                ) : (
                  <BusScheduleDisplay 
                    destination={selectedDestination}
                    outSchedule={busOutSchedule}
                    inSchedule={busInSchedule}
                    nextDepartureOut={busNextDepartureOut}
                    nextDepartureIn={busNextDepartureIn}
                    notes={busSchedule[selectedDestination].notes}
                    scheduleType={isWeekend ? 'Weekend' : 'Weekday'}
                  />
                )}
                <Button onClick={() => setShowFullSchedule(true)} variant="outline" className="w-full text-sm">
                  View Full Schedule
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

