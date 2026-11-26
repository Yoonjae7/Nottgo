import { promises as fs } from "node:fs"
import path from "node:path"
import type { Announcement } from "./announcement.ts"
import { defaultTimetable, type Timetable } from "./data.ts"
import { parseAnnouncement, parseTimetable } from "./timetable.ts"
import { describeChanges, describeContentChanges } from "./timetableDiff.ts"

/**
 * Versioned, server-side storage for what the admin panel controls: the timetable and the announcement banner.
 *
 * Every publish or restore creates a new numbered version, kept as a full snapshot so any of the last
 * MAX_VERSIONS can be restored. Version 0 is the original state: the built-in timetable from lib/data.ts and no
 * announcement. While the built-in timetable is live, timetable updates made in the code show up straight away.
 *
 * - With an Upstash Redis / Vercel KV store connected (KV_REST_API_URL + KV_REST_API_TOKEN, or the
 *   UPSTASH_REDIS_REST_* equivalents) everything is kept there. Required on Vercel, whose filesystem is read-only.
 * - Otherwise it is kept in .data/timetable-store.json, which works for `next dev` and self-hosted `next start`.
 */

export interface SiteContent {
  timetable: Timetable
  announcement: Announcement | null
}

export interface LiveState extends SiteContent {
  /** The live version number; 0 when nothing has ever been published. */
  version: number
  /** False while the built-in timetable from lib/data.ts is live. */
  custom: boolean
  updatedAt: string | null
}

export interface VersionEntry {
  version: number
  createdAt: string
  /** publish: saved from the editor; restore: an older version made live again; original: back to version 0. */
  kind: "publish" | "restore" | "original"
  message: string
  restoredFrom?: number
  /** What this version changed compared with the one before it. */
  changes: string[]
}

export class TimetableStoreError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const MAX_VERSIONS = 100
const MAX_CHANGE_LINES = 30

const KEYS = {
  current: "nottgo:timetable:current",
  history: "nottgo:timetable:history",
  version: (version: number) => `nottgo:timetable:v:${version}`,
}

/** What is stored per version. A null timetable means "use the built-in timetable from the code". */
interface Snapshot {
  timetable: Timetable | null
  announcement: Announcement | null
}

// ---- Key-value backends ------------------------------------------------------------------------

interface KeyValueStore {
  get(keys: string[]): Promise<(string | null)[]>
  /** Writes all entries and deletes `remove` together. */
  write(entries: Record<string, string>, remove: string[]): Promise<void>
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null
}

export const hasRemoteStore = () => redisConfig() !== null

async function redisRequest(endpoint: string, body: unknown): Promise<unknown> {
  const config = redisConfig()
  if (!config) throw new Error("Redis is not configured")
  const response = await fetch(`${config.url}${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => null)) as unknown
  const failure = (Array.isArray(data) ? data : [data]).find(
    (item) => !item || typeof item !== "object" || "error" in item,
  ) as { error?: string } | undefined
  if (!response.ok || failure) throw new Error(`Redis request failed: ${failure?.error ?? response.status}`)
  return data
}

const redisStore: KeyValueStore = {
  async get(keys) {
    const { result } = (await redisRequest("", ["MGET", ...keys])) as { result: (string | null)[] }
    return result
  },
  async write(entries, remove) {
    const commands: string[][] = [["MSET", ...Object.entries(entries).flat()]]
    if (remove.length) commands.push(["DEL", ...remove])
    await redisRequest("/multi-exec", commands)
  },
}

const localFile = () => path.join(process.cwd(), ".data", "timetable-store.json")

async function readLocal(): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(localFile(), "utf8"))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}
    throw error
  }
}

const fileStore: KeyValueStore = {
  async get(keys) {
    const data = await readLocal()
    return keys.map((key) => data[key] ?? null)
  },
  async write(entries, remove) {
    const data = { ...(await readLocal()), ...entries }
    for (const key of remove) delete data[key]
    const file = localFile()
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(`${file}.tmp`, JSON.stringify(data))
    await fs.rename(`${file}.tmp`, file)
  },
}

const store = (): KeyValueStore => (hasRemoteStore() ? redisStore : fileStore)

// ---- Reading -----------------------------------------------------------------------------------

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Validates a stored snapshot; throws if it can't be used. */
function readSnapshot(raw: unknown, label: string): Snapshot {
  const record = (raw && typeof raw === "object" ? raw : {}) as { timetable?: unknown; announcement?: unknown }
  let timetable: Timetable | null = null
  if (record.timetable !== null && record.timetable !== undefined) {
    const parsed = parseTimetable(record.timetable)
    if (!parsed.ok) throw new TimetableStoreError(`${label} is invalid: ${parsed.error}`, 422)
    timetable = parsed.timetable
  }
  const announcement = parseAnnouncement(record.announcement)
  if (!announcement.ok) throw new TimetableStoreError(`${label} is invalid: ${announcement.error}`, 422)
  return { timetable, announcement: announcement.announcement }
}

function toLiveState(snapshot: Snapshot, version: number, updatedAt: string | null): LiveState {
  return {
    timetable: snapshot.timetable ?? defaultTimetable,
    announcement: snapshot.announcement,
    version,
    custom: snapshot.timetable !== null,
    updatedAt,
  }
}

function parseCurrent(raw: string | null): LiveState {
  const record = parseJson<{ version?: unknown; updatedAt?: string | null } | null>(raw, null)
  if (!record || typeof record.version !== "number") return toLiveState({ timetable: null, announcement: null }, 0, null)
  try {
    return toLiveState(readSnapshot(record, `Live version v${record.version}`), record.version, record.updatedAt ?? null)
  } catch (error) {
    // Never take the site down over bad data: show the original content, keep the version number.
    console.error(error)
    return toLiveState({ timetable: null, announcement: null }, record.version, record.updatedAt ?? null)
  }
}

export async function readLiveState(): Promise<LiveState> {
  const [current] = await store().get([KEYS.current])
  return parseCurrent(current)
}

export async function readHistory(): Promise<VersionEntry[]> {
  const [history] = await store().get([KEYS.history])
  return parseJson<VersionEntry[]>(history, [])
}

// ---- Writing -----------------------------------------------------------------------------------

/**
 * Makes `snapshot` live as a new version. `baseVersion` is the live version the admin was looking at; if someone
 * else published since, the write is refused so their work isn't silently overwritten.
 */
async function commit(
  snapshot: Snapshot,
  details: Pick<VersionEntry, "kind" | "message" | "restoredFrom">,
  baseVersion: number,
): Promise<{ state: LiveState; history: VersionEntry[] }> {
  const [rawCurrent, rawHistory] = await store().get([KEYS.current, KEYS.history])
  const current = parseCurrent(rawCurrent)
  const history = parseJson<VersionEntry[]>(rawHistory, [])

  if (baseVersion !== current.version) {
    throw new TimetableStoreError(
      `Someone else made v${current.version} live while you were editing. Check the changes and try again.`,
      409,
    )
  }

  const updatedAt = new Date().toISOString()
  const version = Math.max(current.version, history[0]?.version ?? 0) + 1
  const state = toLiveState(snapshot, version, updatedAt)
  const changes = describeContentChanges(current, state)
  if (changes.length === 0 && state.custom === current.custom) {
    throw new TimetableStoreError(
      details.kind === "publish" ? "Nothing to publish: no changes." : "That version is already live.",
      400,
    )
  }

  const entry: VersionEntry = {
    version,
    createdAt: updatedAt,
    kind: details.kind,
    message: details.message.trim().slice(0, 200),
    ...(details.restoredFrom !== undefined ? { restoredFrom: details.restoredFrom } : {}),
    changes:
      changes.length > MAX_CHANGE_LINES
        ? [...changes.slice(0, MAX_CHANGE_LINES), `…and ${changes.length - MAX_CHANGE_LINES} more`]
        : changes,
  }
  const nextHistory = [entry, ...history]

  await store().write(
    {
      [KEYS.current]: JSON.stringify({ version, updatedAt, ...snapshot }),
      [KEYS.history]: JSON.stringify(nextHistory.slice(0, MAX_VERSIONS)),
      [KEYS.version(version)]: JSON.stringify(snapshot),
    },
    nextHistory.slice(MAX_VERSIONS).map((old) => KEYS.version(old.version)),
  )
  return { state, history: nextHistory.slice(0, MAX_VERSIONS) }
}

/** Publishes edited content (already validated) as a new version. */
export async function publishContent(content: SiteContent, message: string, baseVersion: number) {
  const current = await readLiveState()
  // Leave the built-in timetable in charge if the admin didn't touch it, so later code updates still show up.
  const keepBuiltIn = !current.custom && describeChanges(defaultTimetable, content.timetable).length === 0
  return commit(
    { timetable: keepBuiltIn ? null : content.timetable, announcement: content.announcement },
    { kind: "publish", message },
    baseVersion,
  )
}

/** Makes an older version live again as a new version. Version 0 is the original content. */
export async function restoreVersion(version: number, baseVersion: number) {
  if (version === 0) return commit({ timetable: null, announcement: null }, { kind: "original", message: "" }, baseVersion)

  const [raw] = await store().get([KEYS.version(version)])
  if (raw === null) throw new TimetableStoreError(`Version ${version} is no longer stored.`, 404)
  const snapshot = readSnapshot(parseJson<unknown>(raw, null), `Version ${version}`)
  return commit(snapshot, { kind: "restore", message: "", restoredFrom: version }, baseVersion)
}
