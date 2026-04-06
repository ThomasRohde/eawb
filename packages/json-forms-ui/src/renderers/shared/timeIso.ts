/**
 * UTC ISO time / date-time helpers shared by DateControl, TimeControl, and
 * DateTimeControl. All conversions go through UTC midnight construction so
 * timezone offsets never bump the displayed date by one.
 */

export function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(Date.UTC(year, month, day));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatIsoDate(d: Date | null | undefined): string {
  if (!d) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse `HH:mm` or `HH:mm:ss` into a Date anchored at the UTC epoch. */
export function parseIsoTime(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  const d = new Date(Date.UTC(1970, 0, 1, hours, minutes, seconds));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatIsoTime(d: Date | null | undefined): string {
  if (!d) return '';
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  const seconds = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * ISO 8601 datetime in UTC with `Z` suffix. We always emit seconds so AJV's
 * `date-time` format passes round-trip.
 */
export function parseIsoDateTime(value: unknown): Date | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatIsoDateTime(d: Date | null | undefined): string {
  if (!d) return '';
  // toISOString already returns yyyy-mm-ddTHH:mm:ss.sssZ — strip the millis.
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
