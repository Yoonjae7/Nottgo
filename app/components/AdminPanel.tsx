"use client"

import { useMemo, useState, type FormEvent } from "react"
import { format } from "date-fns"
import { Loader2, Lock, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  buggyStops,
  busDestinations,
  busScheduleLabels,
  type BusTimetable,
  type ScheduleEntry,
  type ScheduleType,
  type Timetable,
} from "@/lib/data"
import type { TimetableState } from "@/lib/timetableStore"

type Direction = "out" | "in"
type BuggyRow = { time: string; skipFriday: boolean }
/** Editor-friendly copy of the timetable: buggy Friday exceptions live on each row. */
interface Draft {
  bus: BusTimetable
  buggy: BuggyRow[]
}

const scheduleTypes = Object.keys(busScheduleLabels) as ScheduleType[]

const toDraft = (timetable: Timetable): Draft => ({
  bus: structuredClone(timetable.bus),
  buggy: timetable.buggy.times.map((time) => ({ time, skipFriday: timetable.buggy.fridayExceptions.includes(time) })),
})

const fromDraft = (draft: Draft): Timetable => ({
  bus: draft.bus,
  buggy: {
    times: draft.buggy.map(({ time }) => time),
    fridayExceptions: draft.buggy.filter(({ skipFriday }) => skipFriday).map(({ time }) => time),
  },
})

async function callApi(method: "POST" | "PUT" | "DELETE", body: object): Promise<TimetableState> {
  const response = await fetch("/api/admin/timetable", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new Error(data?.error ?? `Request failed (${response.status})`)
  return data as TimetableState
}

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong")

const nativeSelectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

interface AdminPanelProps {
  onClose: () => void
  /** Called whenever the saved timetable changes so the page behind the panel updates live. */
  onTimetableChange: (timetable: Timetable) => void
}

export default function AdminPanel({ onClose, onTimetableChange }: AdminPanelProps) {
  const [password, setPassword] = useState("")
  const [saved, setSaved] = useState<TimetableState | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<null | "unlock" | "save" | "reset">(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const [destination, setDestination] = useState(busDestinations[0].id)
  const [scheduleType, setScheduleType] = useState<ScheduleType>("weekday")
  const [direction, setDirection] = useState<Direction>("out")

  const baseline = useMemo(() => (saved ? JSON.stringify(fromDraft(toDraft(saved.timetable))) : ""), [saved])
  const dirty = draft !== null && JSON.stringify(fromDraft(draft)) !== baseline

  const applyState = (state: TimetableState) => {
    setSaved(state)
    setDraft(toDraft(state.timetable))
    onTimetableChange(state.timetable)
  }

  const run = async (kind: "unlock" | "save" | "reset", action: () => Promise<void>) => {
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  const unlock = (event: FormEvent) => {
    event.preventDefault()
    void run("unlock", async () => {
      try {
        applyState(await callApi("POST", { password }))
      } catch (err) {
        setPassword("")
        throw err
      }
    })
  }

  const save = () =>
    draft &&
    run("save", async () => {
      applyState(await callApi("PUT", { password, timetable: fromDraft(draft) }))
      setNotice("Saved. The new timetable is live for everyone.")
    })

  const reset = () =>
    run("reset", async () => {
      applyState(await callApi("DELETE", { password }))
      setConfirmReset(false)
      setNotice("Back to the built-in timetable.")
    })

  const updateDraft = (mutate: (draft: Draft) => void) => {
    setNotice(null)
    setDraft((current) => {
      if (!current) return current
      const next = structuredClone(current)
      mutate(next)
      return next
    })
  }

  const updateEntries = (mutate: (entries: ScheduleEntry[]) => void) =>
    updateDraft((d) => mutate(d.bus[destination][scheduleType][direction]))

  if (!saved || !draft) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-sm">
          <form onSubmit={unlock} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" aria-hidden /> Admin
              </DialogTitle>
              <DialogDescription>Enter the admin password to edit the timetable.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={error !== null}
                aria-describedby={error ? "admin-password-error" : undefined}
              />
              {error && (
                <p id="admin-password-error" className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!password || busy !== null}>
              {busy === "unlock" && <Loader2 className="animate-spin" aria-hidden />}
              Unlock
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }

  const route = draft.bus[destination]
  const entries = route[scheduleType][direction]
  const isWeekend = scheduleType === "weekend"
  const directionLabel = direction === "out" ? "From campus" : "To campus"
  const noteText = typeof route.notes === "string" ? route.notes : route.notes[direction]
  const rowGrid = isWeekend
    ? "grid-cols-[7rem_5.5rem_minmax(0,1fr)_7.5rem_2.25rem]"
    : "grid-cols-[7rem_5.5rem_minmax(0,1fr)_2.25rem]"

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] max-w-3xl flex-col gap-0 p-0 focus:outline-none"
        // Don't lose unsaved edits to a stray click or Escape; the close button still works.
        onInteractOutside={(event) => dirty && event.preventDefault()}
        onEscapeKeyDown={(event) => dirty && event.preventDefault()}
      >
        <DialogHeader className="border-b px-6 py-4 text-left">
          <DialogTitle>Timetable admin</DialogTitle>
          <DialogDescription>
            {saved.custom
              ? `Custom timetable${saved.updatedAt ? ` · last saved ${format(new Date(saved.updatedAt), "d MMM yyyy, HH:mm")}` : ""}`
              : "Showing the built-in timetable"}
            {dirty && <span className="font-medium text-amber-600 dark:text-amber-400"> · Unsaved changes</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="bus" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 grid grid-cols-2">
            <TabsTrigger value="bus">Bus</TabsTrigger>
            <TabsTrigger value="buggy">Buggy</TabsTrigger>
          </TabsList>

          <TabsContent value="bus" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-2">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <div className="space-y-1.5">
                <Label>Route</Label>
                <Select value={destination} onValueChange={setDestination}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {busDestinations.map(({ id, name }) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Days</Label>
                <Select value={scheduleType} onValueChange={(value) => setScheduleType(value as ScheduleType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {busScheduleLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              {(["out", "in"] as const).map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={direction === value ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setDirection(value)}
                >
                  {value === "out" ? "From campus" : "To campus"}
                  <span className="text-xs opacity-70">({route[scheduleType][value].length})</span>
                </Button>
              ))}
            </div>

            {entries.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No departures. This route doesn&apos;t run {directionLabel.toLowerCase()} on these days.
              </p>
            ) : (
              <div className="space-y-2">
                <div className={cn("grid gap-2 text-xs font-medium text-muted-foreground", rowGrid)}>
                  <span>Time</span>
                  <span>Service</span>
                  <span>Note</span>
                  {isWeekend && <span>Runs on</span>}
                  <span className="sr-only">Remove</span>
                </div>
                {entries.map((entry, index) => (
                  <div key={index} className={cn("grid items-center gap-2", rowGrid)}>
                    <Input
                      type="time"
                      aria-label={`Departure ${index + 1} time`}
                      value={entry.time}
                      onChange={({ target: { value } }) => updateEntries((list) => void (list[index].time = value))}
                      className={cn("h-9 px-2", !entry.time && "border-destructive")}
                    />
                    <select
                      aria-label={`Departure ${index + 1} service`}
                      value={entry.serviceType}
                      onChange={({ target: { value } }) =>
                        updateEntries((list) => void (list[index].serviceType = value as "bus" | "van"))
                      }
                      className={nativeSelectClass}
                    >
                      <option value="bus">Bus</option>
                      <option value="van">Van</option>
                    </select>
                    <Input
                      aria-label={`Departure ${index + 1} note`}
                      placeholder="Optional"
                      value={entry.note ?? ""}
                      onChange={({ target: { value } }) => updateEntries((list) => void (list[index].note = value))}
                      className="h-9"
                    />
                    {isWeekend && (
                      <select
                        aria-label={`Departure ${index + 1} runs on`}
                        value={entry.saturdayOnly ? "sat" : entry.sundayOnly ? "sun" : "both"}
                        onChange={({ target: { value } }) =>
                          updateEntries((list) => {
                            list[index].saturdayOnly = value === "sat" || undefined
                            list[index].sundayOnly = value === "sun" || undefined
                          })
                        }
                        className={nativeSelectClass}
                      >
                        <option value="both">Sat &amp; Sun</option>
                        <option value="sat">Saturday</option>
                        <option value="sun">Sunday</option>
                      </select>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove departure ${entry.time || index + 1}`}
                      onClick={() => updateEntries((list) => void list.splice(index, 1))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateEntries((list) => void list.push({ time: "", serviceType: list.at(-1)?.serviceType ?? "bus" }))
                }
              >
                <Plus /> Add departure
              </Button>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                Replace with times from
                <select
                  value=""
                  onChange={({ target: { value } }) => {
                    const source = value as ScheduleType
                    updateDraft((d) => {
                      const sourceEntries = d.bus[destination][source][direction]
                      d.bus[destination][scheduleType][direction] = structuredClone(sourceEntries)
                    })
                  }}
                  className={cn(nativeSelectClass, "h-8 w-auto text-xs")}
                >
                  <option value="" disabled>
                    choose days…
                  </option>
                  {scheduleTypes
                    .filter((type) => type !== scheduleType)
                    .map((type) => (
                      <option key={type} value={type}>
                        {busScheduleLabels[type]}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-route-notes">Notes shown for {directionLabel.toLowerCase()} (all days)</Label>
              <Textarea
                id="admin-route-notes"
                rows={3}
                value={noteText}
                onChange={({ target: { value } }) =>
                  updateDraft((d) => {
                    const notes = d.bus[destination].notes
                    const both = typeof notes === "string" ? { out: notes, in: notes } : notes
                    d.bus[destination].notes = { ...both, [direction]: value }
                  })
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="buggy" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-2">
            <p className="text-sm text-muted-foreground">
              Departure times from {buggyStops[0]}. Each following stop is 3 minutes later. Buggies run Monday to
              Friday only.
            </p>
            {draft.buggy.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No buggy departures.
              </p>
            ) : (
              <div className="space-y-2">
                {draft.buggy.map((row, index) => (
                  <div key={index} className="grid grid-cols-[7rem_minmax(0,1fr)_2.25rem] items-center gap-3">
                    <Input
                      type="time"
                      aria-label={`Buggy departure ${index + 1} time`}
                      value={row.time}
                      onChange={({ target: { value } }) => updateDraft((d) => void (d.buggy[index].time = value))}
                      className={cn("h-9 px-2", !row.time && "border-destructive")}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={row.skipFriday}
                        onCheckedChange={(checked) => updateDraft((d) => void (d.buggy[index].skipFriday = checked === true))}
                      />
                      Not on Fridays (prayer)
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove buggy departure ${row.time || index + 1}`}
                      onClick={() => updateDraft((d) => void d.buggy.splice(index, 1))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateDraft((d) => void d.buggy.push({ time: "", skipFriday: false }))}
            >
              <Plus /> Add time
            </Button>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 border-t px-6 py-4">
          {(error || notice) && (
            <p role="status" className={cn("text-sm", error ? "text-destructive" : "text-emerald-700 dark:text-emerald-400")}>
              {error ?? notice}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {confirmReset ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Replace all edits with the built-in timetable?</span>
                <Button type="button" size="sm" variant="destructive" onClick={reset} disabled={busy !== null}>
                  {busy === "reset" && <Loader2 className="animate-spin" aria-hidden />}
                  Reset
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start text-muted-foreground"
                onClick={() => setConfirmReset(true)}
                disabled={!saved.custom || busy !== null}
              >
                <RotateCcw /> Reset to built-in
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  setDraft(toDraft(saved.timetable))
                  setError(null)
                }}
                disabled={!dirty || busy !== null}
              >
                Discard changes
              </Button>
              <Button type="button" className="flex-1 sm:flex-none" onClick={save} disabled={!dirty || busy !== null}>
                {busy === "save" && <Loader2 className="animate-spin" aria-hidden />}
                Save
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
