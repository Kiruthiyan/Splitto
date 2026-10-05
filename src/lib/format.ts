/**
 * Formats a "YYYY-MM-DD" date or ISO timestamp as "5 Oct 2026".
 * Date-only strings are parsed as local dates to avoid timezone shifts.
 */
export function formatDisplayDate(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
