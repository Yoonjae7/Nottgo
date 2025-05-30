"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { buggySchedule, buggyStops, fridayExceptionTimes } from "@/lib/data"
import { addMinutes, format, parse } from "date-fns"

interface FullBuggyScheduleProps {
  onClose: () => void
  isFriday: boolean
}

export default function FullBuggySchedule({ onClose, isFriday }: FullBuggyScheduleProps) {
  const calculateTime = (baseTime: string, stopIndex: number) => {
    const date = parse(baseTime, "HH:mm", new Date())
    return format(addMinutes(date, 3 * stopIndex), "HH:mm")
  }

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
              {buggySchedule.map((time) => {
                const isFridayException = isFriday && fridayExceptionTimes.includes(time)
                return (
                  <TableRow key={time} className={isFridayException ? "bg-red-50" : ""}>
                    {buggyStops.map((_, index) => (
                      <TableCell
                        key={`${time}-${index}`}
                        className={`text-sm py-2 text-center ${isFridayException ? "text-red-500" : ""}`}
                      >
                        {isFridayException ? "-" : calculateTime(time, index)}
                      </TableCell>
                    ))}
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
