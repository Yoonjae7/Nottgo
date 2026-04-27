"use client"

import { useEffect, useMemo, useState } from "react"
import { addMinutes, format, parse } from "date-fns"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { buggySchedule, buggyStops, fridayExceptionTimes, getBuggyNextArrival } from "@/lib/data"
import { getBuggySlotVisual } from "@/lib/scheduleSlotVisual"
import { ScheduleTimeSlot } from "./ScheduleTimeSlot"

interface FullBuggyScheduleProps {
  onClose: () => void
  isFriday: boolean
}

export default function FullBuggySchedule({ onClose, isFriday }: FullBuggyScheduleProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  /** Per-row cell times only depend on the base schedule + stop offset (3 min/stop), not on `now`. */
  const cellTimesPerRow = useMemo(() => {
    const baseDate = new Date()
    return buggySchedule.map((baseTime) => {
      const parsed = parse(baseTime, "HH:mm", baseDate)
      return buggyStops.map((_, index) => format(addMinutes(parsed, 3 * index), "HH:mm"))
    })
  }, [])

  /** One next-arrival per stop — recomputed when the clock ticks or Friday flips. */
  const nextArrivalsPerStop = useMemo(
    () => buggyStops.map((_, index) => getBuggyNextArrival(index, now, isFriday)),
    [now, isFriday],
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Full Buggy Schedule</CardTitle>
        <CardDescription className="text-sm">
          Monday - Friday (No service on Weekends and Public Holidays)
        </CardDescription>
        {isFriday && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>No service between 12:30 PM - 2:00 PM due to Friday Prayer</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {buggyStops.map((stop) => (
                  <TableHead key={stop} className="text-xs whitespace-nowrap text-center">
                    {stop}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {buggySchedule.map((time, rowIndex) => {
                const isFridayException = isFriday && fridayExceptionTimes.includes(time)
                return (
                  <TableRow key={time} className={isFridayException ? "bg-red-50" : ""}>
                    {buggyStops.map((_, index) => {
                      if (isFridayException) {
                        return (
                          <TableCell
                            key={`${time}-${index}`}
                            className="text-sm py-2 text-center text-red-500"
                          >
                            -
                          </TableCell>
                        )
                      }
                      const cellTime = cellTimesPerRow[rowIndex][index]
                      const visual = getBuggySlotVisual(cellTime, nextArrivalsPerStop[index], now)
                      return (
                        <TableCell key={`${time}-${index}`} className="p-1.5 text-center align-top">
                          <ScheduleTimeSlot visual={visual} className="w-full min-w-0 text-sm" tabularNums>
                            {cellTime}
                          </ScheduleTimeSlot>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {isFriday && (
          <div className="p-4 text-xs text-red-500">* Rows in red indicate no service due to Friday Prayer</div>
        )}
        <div className="p-4">
          <Button onClick={onClose} className="w-full text-sm">
            Back to Stop Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
