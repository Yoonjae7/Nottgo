"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
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
  busSchedule,
  getScheduleType,
  type ScheduleType,
} from "@/lib/data"
import BuggyScheduleDisplay from "./components/BuggyScheduleDisplay"
import BusScheduleDisplay from "./components/BusScheduleDisplay"
import FullBuggySchedule from "./components/FullBuggySchedule"
import FullBusSchedule from "./components/FullBusSchedule"

export default function Home() {
  const [selectedStop, setSelectedStop] = useState<number>(0)
  const [selectedDestination, setSelectedDestination] = useState<string>(busDestinations[0].id)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [autoScheduleType, setAutoScheduleType] = useState<ScheduleType>("weekday")
  const [manualScheduleType, setManualScheduleType] = useState<ScheduleType | null>(null)
  const [isFriday, setIsFriday] = useState(false)
  const [isBuggy, setIsBuggy] = useState(true)

  // Use manual override if set, otherwise use automatic detection
  const scheduleType = manualScheduleType || autoScheduleType

  useEffect(() => {
    // Initialize time on client side only to avoid hydration mismatch
    const now = new Date()
    setCurrentTime(now)
    setAutoScheduleType(getScheduleType(now))
    setIsFriday(now.getDay() === 5)

    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      // Only update auto schedule type if manual override is not set
      if (!manualScheduleType) {
        setAutoScheduleType(getScheduleType(now))
      }
      setIsFriday(now.getDay() === 5)
    }, 1000)

    return () => clearInterval(timer)
  }, [manualScheduleType])

  // Use a fallback date if currentTime is not yet initialized
  const timeForCalculations = currentTime || new Date()
  const buggyNextArrival = getBuggyNextArrival(selectedStop, timeForCalculations, isFriday)
  const buggyArrivalTimes = getBuggyArrivalTimes(selectedStop, isFriday)

  const busOutSchedule = getBusSchedule(selectedDestination, scheduleType, "out")
  const busInSchedule = getBusSchedule(selectedDestination, scheduleType, "in")
  const busNextDepartureOut = getBusNextDeparture(selectedDestination, scheduleType, "out", timeForCalculations)
  const busNextDepartureIn = getBusNextDeparture(selectedDestination, scheduleType, "in", timeForCalculations)

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-2 sm:p-4 md:p-6 bg-gray-100">
      <Card className="w-full max-w-[95%] sm:max-w-md">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Campus Shuttle System</CardTitle>
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
              <Select onValueChange={(value) => setSelectedStop(Number(value))} defaultValue={selectedStop.toString()}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a stop" />
                </SelectTrigger>
                <SelectContent>
                  {buggyStops.map((stop, index) => (
                    <SelectItem key={stop} value={index.toString()}>
                      {stop}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-2">Select your destination:</p>
                <Select onValueChange={setSelectedDestination} defaultValue={selectedDestination}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {busDestinations.map((destination) => (
                      <SelectItem key={destination.id} value={destination.id}>
                        {destination.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showFullSchedule ? (
              isBuggy ? (
                <FullBuggySchedule onClose={() => setShowFullSchedule(false)} isFriday={isFriday} />
              ) : (
                <FullBusSchedule destination={selectedDestination} onClose={() => setShowFullSchedule(false)} />
              )
            ) : (
              <>
                {isBuggy ? (
                  <BuggyScheduleDisplay
                    nextArrival={buggyNextArrival}
                    arrivalTimes={buggyArrivalTimes}
                    scheduleType={scheduleType === "weekend" ? "Weekend" : "Weekday"}
                    stopIndex={selectedStop}
                    isFriday={isFriday}
                    currentTime={timeForCalculations}
                  />
                ) : (
                  <BusScheduleDisplay
                    destination={selectedDestination}
                    outSchedule={busOutSchedule}
                    inSchedule={busInSchedule}
                    nextDepartureOut={busNextDepartureOut}
                    nextDepartureIn={busNextDepartureIn}
                    notes={busSchedule[selectedDestination].notes}
                    scheduleType={scheduleType}
                    isManualOverride={manualScheduleType !== null}
                    onScheduleTypeChange={setManualScheduleType}
                    currentTime={timeForCalculations}
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
