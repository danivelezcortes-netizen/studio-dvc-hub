const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

export const SLOTS = [
  { id: 'mañana', label: 'mañana (06:00–11:59)', start: 6 * 60, end: 12 * 60 },
  { id: 'tarde', label: 'tarde (12:00–17:59)', start: 12 * 60, end: 18 * 60 },
  { id: 'noche', label: 'noche (18:00–21:59)', start: 18 * 60, end: 22 * 60 },
] as const;

const numberFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatInt(value: number): string {
  return numberFormat.format(value);
}

export function formatDecimal(value: number): string {
  return decimalFormat.format(value);
}

export function formatPercent(value: number, digits = 1): string {
  const formatted = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${formatted} %`;
}

export function parisParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

export function parisDateKey(date: Date): string {
  const { year, month, day } = parisParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

/** Offset of Europe/Paris at this instant, in milliseconds (local clock minus UTC). */
export function parisOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(read('year'), read('month') - 1, read('day'), read('hour'), read('minute'), read('second'));
  return asUtc - instant.getTime();
}

/** UTC instant when the Paris clock reads the given civil time. */
export function parisCivilToUtc(isoDate: string, hour = 0, minute = 0): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = parisOffsetMs(guess);
  const corrected = new Date(guess.getTime() - offset);
  const offsetAtResult = parisOffsetMs(corrected);
  return new Date(guess.getTime() - offsetAtResult);
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatPosted(date: Date): {
  date: string;
  timeParis: string;
  weekday: string;
  weekdayIndex: number;
  postedLabel: string;
  minutes: number;
} {
  const parts = parisParts(date);
  const dateKey = parisDateKey(date);
  const weekdayName = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
  }).format(date);
  const weekday = weekdayName.toLowerCase();
  const weekdayIndex = WEEKDAYS.indexOf(weekday as (typeof WEEKDAYS)[number]);
  const timeParis = `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
  const postedLabel = `${weekday} ${parts.day} ${MONTHS[parts.month - 1]}, ${timeParis}`;
  return {
    date: dateKey,
    timeParis,
    weekday,
    weekdayIndex,
    postedLabel,
    minutes: parts.hour * 60 + parts.minute,
  };
}

export function formatParisStamp(date: Date): string {
  const parts = parisParts(date);
  return `${parts.day} ${MONTHS[parts.month - 1]} ${parts.year}, ${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')} hora de París`;
}

export function formatDateKey(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

export function slotForMinutes(minutes: number): { id: string; label: string } {
  const match = SLOTS.find((slot) => minutes >= slot.start && minutes < slot.end);
  if (match) return { id: match.id, label: match.label };
  return { id: 'noche tardía', label: 'noche tardía (22:00–05:59)' };
}

export function weekdayOrder(): readonly string[] {
  return WEEKDAYS;
}
