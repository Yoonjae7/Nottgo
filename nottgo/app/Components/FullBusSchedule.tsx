import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { busSchedule, busDestinations } from '@/lib/data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FullBusScheduleProps {
  destination: string
  onClose: () => void
}

export default function FullBusSchedule({ destination, onClose }: FullBusScheduleProps) {
  const [currentTab, setCurrentTab] = useState<'weekday' | 'weekend'>('weekday')
  const schedule = busSchedule[destination]
  const destinationName = busDestinations.find(d => d.id === destination)?.name || destination

  const renderSchedule = (day: 'weekday' | 'weekend') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Direction</TableHead>
          <TableHead className="text-xs">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {schedule[day].out.length > 0 ? (
          schedule[day].out.map((time) => (
            <TableRow key={`out-${time}`}>
              <TableCell className="text-sm py-2">Outbound</TableCell>
              <TableCell className="text-sm py-2">{time}</TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="text-sm py-2">Outbound</TableCell>
            <TableCell className="text-sm py-2 text-gray-500">No service</TableCell>
          </TableRow>
        )}
        {schedule[day].in.length > 0 ? (
          schedule[day].in.map((time) => (
            <TableRow key={`in-${time}`}>
              <TableCell className="text-sm py-2">Inbound</TableCell>
              <TableCell className="text-sm py-2">{time}</TableCell>
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
        <CardDescription className="text-sm">
          View weekday and weekend schedules
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="weekday" onValueChange={(value) => setCurrentTab(value as 'weekday' | 'weekend')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekday">Weekday</TabsTrigger>
            <TabsTrigger value="weekend">Weekend</TabsTrigger>
          </TabsList>
          <TabsContent value="weekday">
            <div className="overflow-x-auto">
              {renderSchedule('weekday')}
            </div>
          </TabsContent>
          <TabsContent value="weekend">
            <div className="overflow-x-auto">
              {renderSchedule('weekend')}
            </div>
          </TabsContent>
        </Tabs>
        {schedule.notes && (
          <div className="p-4 text-sm text-gray-600">
            <h3 className="font-semibold mb-1">Notes:</h3>
            <p>{schedule.notes}</p>
          </div>
        )}
        <div className="p-4">
          <Button onClick={onClose} className="w-full text-sm">Back to Route Schedule</Button>
        </div>
      </CardContent>
    </Card>
  )
}

