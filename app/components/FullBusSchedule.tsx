"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { busSchedule, busDestinations, type ScheduleType } from "@/lib/data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FullBusScheduleProps {
  destination: string
  onClose: () => void
}

export default function FullBusSchedule({ destination, onClose }: FullBusScheduleProps) {
  const [currentTab, setCurrentTab] = useState<ScheduleType>("weekday")
  const schedule = busSchedule[destination]
  const destinationName = busDestinations.find((d) => d.id === destination)?.name || destination

  const renderSchedule = (scheduleType: ScheduleType) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Direction</TableHead>
          <TableHead className="text-xs">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedule[scheduleType].out.length > 0 ? (
          schedule[scheduleType].out.map((entry) => (
            <TableRow key={`out-${entry.time}`}>
              <TableCell className="text-sm py-2">Outbound</TableCell>
              <TableCell className="text-sm py-2">{entry.time}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="text-sm py-2">Outbound</TableCell>
            <TableCell className="text-sm py-2 text-gray-500">No service</TableCell>
          </TableRow>
        )}
        {schedule[scheduleType].in.length > 0 ? (
          schedule[scheduleType].in.map((entry) => (
            <TableRow key={`in-${entry.time}`}>
              <TableCell className="text-sm py-2">Inbound</TableCell>
              <TableCell className="text-sm py-2">{entry.time}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="text-sm py-2">Inbound</TableCell>
            <TableCell className="text-sm py-2 text-gray-500">No service</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Full Bus Schedule - {destinationName}</CardTitle>
        <CardDescription className="text-sm">View all schedule types</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="weekday" onValueChange={(value) => setCurrentTab(value as ScheduleType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weekday">Mon-Thu</TabsTrigger>
            <TabsTrigger value="friday">Friday</TabsTrigger>
            <TabsTrigger value="weekend">Sat-Sun</TabsTrigger>
          </TabsList>
          <TabsContent value="weekday">
            <div className="overflow-x-auto">{renderSchedule("weekday")}</div>
          </TabsContent>
          <TabsContent value="friday">
            <div className="overflow-x-auto">{renderSchedule("friday")}</div>
          </TabsContent>
          <TabsContent value="weekend">
            <div className="overflow-x-auto">{renderSchedule("weekend")}</div>
          </TabsContent>
        </Tabs>
        {schedule.notes && (
          <div className="p-4 text-sm text-gray-600">
            <h3 className="font-semibold mb-1">Notes:</h3>
            <p>{schedule.notes}</p>
          </div>
        )}
        <div className="p-4">
          <Button onClick={onClose} className="w-full text-sm">
            Back to Route Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
