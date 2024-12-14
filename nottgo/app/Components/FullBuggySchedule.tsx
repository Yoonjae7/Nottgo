import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { buggySchedule } from '@/lib/data' // Updated import statement
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FullBuggyScheduleProps {
  onClose: () => void
}

export default function FullBuggySchedule({ onClose }: FullBuggyScheduleProps) {
  const [currentTab, setCurrentTab] = useState<'weekday' | 'weekend'>('weekday')

  const renderSchedule = (day: 'weekday' | 'weekend') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Time</TableHead>
          <TableHead className="text-xs">Availability</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {buggySchedule.map((time) => (
          <TableRow key={time}>
            <TableCell className="text-sm py-2">{time}</TableCell>
            <TableCell className="text-xs py-2">
              {day === 'weekday' ? (
                ['12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'].includes(time)
                  ? 'Not on Fridays'
                  : 'Every weekday'
              ) : (
                'No service'
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Full Buggy Schedule</CardTitle>
        <CardDescription className="text-sm">Departure times from Trent Building</CardDescription>
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
        <div className="p-4">
          <Button onClick={onClose} className="w-full text-sm">Back to Stop Schedule</Button>
        </div>
      </CardContent>
    </Card>
  )
}

