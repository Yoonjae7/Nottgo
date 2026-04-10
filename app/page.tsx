"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BusFront, CarFront } from "lucide-react"
import { cn } from "@/lib/utils"
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
import LiveBusErrorBoundary from "./components/LiveBusErrorBoundary"
import LiveBusLocation from "./components/LiveBusLocation"

export default function Home() {
  const [selectedStop, setSelectedStop] = useState<number>(0)
  const [selectedDestination, setSelectedDestination] = useState<string>(busDestinations[0].id)
  const [selectedDirection, setSelectedDirection] = useState<"out" | "in" | null>(null)
  const [showFullSchedule, setShowFullSchedule] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [scheduleType, setScheduleType] = useState<ScheduleType>("weekday")
  const [isFriday, setIsFriday] = useState(false)
  const [isBuggy, setIsBuggy] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Set mounted to true after component mounts on client
    setMounted(true)
    
    // Initialize time and schedule type immediately
    const now = new Date()
    setCurrentTime(now)
    setScheduleType(getScheduleType(now))
    setIsFriday(now.getDay() === 5)

    // Then update every second
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      setScheduleType(getScheduleType(now))
      setIsFriday(now.getDay() === 5)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Only calculate schedules after component is mounted to avoid SSR/hydration mismatches
  const buggyNextArrival = mounted ? getBuggyNextArrival(selectedStop, currentTime, isFriday) : null
  const buggyArrivalTimes = mounted ? getBuggyArrivalTimes(selectedStop, isFriday) : []

  const busOutSchedule = mounted ? getBusSchedule(selectedDestination, scheduleType, "out") : []
  const busInSchedule = mounted ? getBusSchedule(selectedDestination, scheduleType, "in") : []
  const busNextDepartureOut = mounted ? getBusNextDeparture(selectedDestination, scheduleType, "out", currentTime) : null
  const busNextDepartureIn = mounted ? getBusNextDeparture(selectedDestination, scheduleType, "in", currentTime) : null

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start px-3 py-6 sm:px-4 sm:py-8 md:px-6">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-slate-100 via-sky-50/80 to-emerald-50/60 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/40"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-24 top-0 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl dark:bg-sky-600/20"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-20 bottom-0 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-700/15"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed left-1/2 top-24 h-48 w-[min(100%,28rem)] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl dark:bg-primary/10"
        aria-hidden
      />

      <Card className="relative w-full max-w-[95%] sm:max-w-md rounded-2xl border-border/60 bg-card/85 shadow-xl shadow-slate-300/25 ring-1 ring-slate-200/70 backdrop-blur-md dark:bg-card/90 dark:shadow-black/40 dark:ring-white/10">
        <CardHeader className="border-b border-border/50 bg-gradient-to-br from-card via-card to-primary/[0.06] pb-5 dark:to-primary/10">
          <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">Campus Shuttle</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div
              className="relative flex w-full rounded-2xl border border-border/60 bg-muted/60 p-1 shadow-sm sm:mx-auto sm:max-w-sm"
              role="tablist"
              aria-label="Choose shuttle type"
            >
              <span
                aria-hidden
                className={cn(
                  "pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-xl bg-background shadow-md ring-1 ring-black/5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none dark:ring-white/10",
                  isBuggy ? "translate-x-full" : "translate-x-0",
                )}
              />
              <button
                type="button"
                role="tab"
                aria-selected={!isBuggy}
                onClick={() => setIsBuggy(false)}
                className={cn(
                  "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  !isBuggy ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <BusFront
                  className={cn("h-5 w-5 shrink-0 transition-transform duration-200", !isBuggy && "scale-105")}
                  strokeWidth={!isBuggy ? 2.25 : 2}
                  aria-hidden
                />
                <span>Bus</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isBuggy}
                onClick={() => setIsBuggy(true)}
                className={cn(
                  "relative z-10 flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isBuggy ? "text-foreground" : "text-muted-foreground hover:text-foreground/80",
                )}
              >
                <CarFront
                  className={cn("h-5 w-5 shrink-0 transition-transform duration-200", isBuggy && "scale-105")}
                  strokeWidth={isBuggy ? 2.25 : 2}
                  aria-hidden
                />
                <span>Buggy</span>
              </button>
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
                    currentTime={currentTime}
                  />
                ) : selectedDirection ? (
                  <BusScheduleDisplay
                    destination={selectedDestination}
                    direction={selectedDirection}
                    schedule={selectedDirection === "out" ? busOutSchedule : busInSchedule}
                    nextDeparture={selectedDirection === "out" ? busNextDepartureOut : busNextDepartureIn}
                    notes={busSchedule[selectedDestination as keyof typeof busSchedule].notes}
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
                {!isBuggy && !showFullSchedule && (
                  <LiveBusErrorBoundary>
                    <LiveBusLocation />
                  </LiveBusErrorBoundary>
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
