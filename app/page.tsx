import { defaultTimetable } from "@/lib/data"
import { getLiveContent } from "@/lib/liveContent"
import HomePage, { type LiveContent } from "./components/HomePage"

// Publishing in the admin panel revalidates this page straight away; this is just a safety net.
export const revalidate = 60

export default async function Page() {
  // Version -1 lets any successfully fetched version replace this fallback.
  let live: LiveContent = { version: -1, timetable: defaultTimetable, announcement: null }
  try {
    live = await getLiveContent()
  } catch (error) {
    console.error("Couldn't load the live content; using the built-in timetable.", error)
  }
  return <HomePage initialLive={live} />
}
