import { NextResponse } from "next/server"
import { asVersionNumber, errorResponse, readBody, rejectWrongPassword, revalidateLiveContent } from "@/lib/adminApi"
import { restoreVersion } from "@/lib/timetableStore"

export const dynamic = "force-dynamic"

/** Make an older version (0 = the original content) live again. This adds a new version; history is never rewritten. */
export async function POST(request: Request) {
  const body = await readBody(request)
  const rejected = await rejectWrongPassword(body)
  if (rejected) return rejected

  const version = asVersionNumber(body.version)
  const baseVersion = asVersionNumber(body.baseVersion)
  if (version === null || baseVersion === null) {
    return NextResponse.json({ error: "Missing version or baseVersion" }, { status: 400 })
  }

  try {
    const result = await restoreVersion(version, baseVersion)
    revalidateLiveContent()
    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error)
  }
}
