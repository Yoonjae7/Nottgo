/**
 * Remaining time until departure/arrival. We round minutes UP so the figure
 * lands on the bus's actual clock minute (e.g. at 00:47:25 a 09:00 departure
 * shows "in 8 hours 13 minutes", not 12).
 */
export function formatArrivalCountdown(diffMs: number): string {
  if (diffMs <= 0) return "Soon"
  if (diffMs <= 60_000) return "Soon"

  const totalMins = Math.ceil(diffMs / 60_000)

  if (totalMins < 1) return "Soon"
  if (totalMins < 60) {
    return totalMins === 1 ? "In 1 minute" : `In ${totalMins} minutes`
  }

  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60

  if (m === 0) {
    return h === 1 ? "In 1 hour" : `In ${h} hours`
  }

  const hourPart = h === 1 ? "1 hour" : `${h} hours`
  const minPart = m === 1 ? "1 minute" : `${m} minutes`
  return `In ${hourPart} ${minPart}`
}
