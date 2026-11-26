import { defaultTimetable } from "@/lib/data"
import { readTimetableState } from "@/lib/timetableStore"
import HomePage from "./components/HomePage"

// Saving in the admin panel revalidates this page straight away; this is just a safety net.
export const revalidate = 60

export default async function Page() {
  let timetable = defaultTimetable
  try {
    timetable = (await readTimetableState()).timetable
  } catch (error) {
    console.error("Couldn't load the saved timetable; using the built-in one.", error)
  }
  return <HomePage initialTimetable={timetable} />
}
