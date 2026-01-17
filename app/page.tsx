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
  const [selectedDirection, setSelectedDirection] = useState<"out" | "in" | null>(null)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [scheduleType, setScheduleType] = useState<ScheduleType>("weekday")
  const [isFriday, setIsFriday] = useState(false)
  const [isBuggy, setIsBuggy] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      setScheduleType(getScheduleType(now))
      setIsFriday(now.getDay() === 5)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const buggyNextArrival = getBuggyNextArrival(selectedStop, currentTime, isFriday)
  const buggyArrivalTimes = getBuggyArrivalTimes(selectedStop, isFriday)

  const busOutSchedule = getBusSchedule(selectedDestination, scheduleType, "out")
  const busInSchedule = getBusSchedule(selectedDestination, scheduleType, "in")
  const busNextDepartureOut = getBusNextDeparture(selectedDestination, scheduleType, "out", currentTime)
  const busNextDepartureIn = getBusNextDeparture(selectedDestination, scheduleType, "in", currentTime)

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
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Select your destination:</p>
                  <Select 
                    onValueChange={(value) => {
                      setSelectedDestination(value)
                      setSelectedDirection(null) // Reset direction when destination changes
                    }} 
                    defaultValue={selectedDestination}
                  >
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
                
                {selectedDestination && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Select direction:</p>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setSelectedDirection("out")}
                        variant={selectedDirection === "out" ? "default" : "outline"}
                        className="flex-1"
                      >
                        From Campus
                      </Button>
                      <Button
                        onClick={() => setSelectedDirection("in")}
                        variant={selectedDirection === "in" ? "default" : "outline"}
                        className="flex-1"
                      >
                        To Campus
                      </Button>
                    </div>
                  </div>
                )}
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
                  />
                ) : selectedDirection ? (
                  <BusScheduleDisplay
                    destination={selectedDestination}
                    direction={selectedDirection}
                    schedule={selectedDirection === "out" ? busOutSchedule : busInSchedule}
                    nextDeparture={selectedDirection === "out" ? busNextDepartureOut : busNextDepartureIn}
                    notes={busSchedule[selectedDestination].notes}
                    scheduleType={scheduleType}
                    currentTime={currentTime}
                  />
                ) : (
                  <Card className="w-full">
                    <CardContent className="pt-6">
                      <p className="text-center text-gray-500 text-sm">
                        Please select a direction above
                      </p>
                    </CardContent>
                  </Card>
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
