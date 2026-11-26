import { unstable_cache } from "next/cache"
import { readLiveState } from "./timetableStore.ts"

/** Cache tag for everything visitors see; publishing or restoring a version calls revalidateTag with it. */
export const LIVE_CONTENT_TAG = "live-content"

/**
 * The live timetable and announcement, cached and shared by every visitor (the page and /api/live), so the
 * store is read about once a minute rather than once per visit.
 */
export const getLiveContent = unstable_cache(
  async () => {
    const { version, timetable, announcement } = await readLiveState()
    return { version, timetable, announcement }
  },
  ["live-content"],
  { tags: [LIVE_CONTENT_TAG], revalidate: 60 },
)
