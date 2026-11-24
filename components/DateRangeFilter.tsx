'use client';

import { addIsoDays, parisDateKey } from '@/lib/format';

export const RELAUNCH_DATE = '2026-10-29';

export type DateRange = { from: string; to: string };
export type DatePreset = 'relaunch' | '7d' | '30d' | 'custom';

const PRESETS: { id: Exclude<DatePreset, 'custom'>; label: string }[] = [
  { id: 'relaunch', label: 'Desde el relanzamiento' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
];

function todayParis(): string {
  return parisDateKey(new Date());
}

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

function minIso(a: string, b: string): string {
  return a <= b ? a : b;
}

export function rangeForPreset(
  preset: Exclude<DatePreset, 'custom'>,
  today = todayParis(),
): DateRange {
  if (preset === 'relaunch') return { from: RELAUNCH_DATE, to: today };
  const offset = preset === '7d' ? 6 : 29;
  return {
    from: maxIso(addIsoDays(today, -offset), RELAUNCH_DATE),
    to: today,
  };
}

export function clampRange(range: DateRange, today = todayParis()): DateRange {
  let from = maxIso(range.from || RELAUNCH_DATE, RELAUNCH_DATE);
  let to = minIso(range.to || today, today);
  from = minIso(from, today);
  to = maxIso(to, RELAUNCH_DATE);
  if (from > to) to = from;
  return { from, to };
}

export function DateRangeFilter({
  preset,
  range,
  onPreset,
  onRange,
}: {
  preset: DatePreset;
  range: DateRange;
  onPreset: (preset: Exclude<DatePreset, 'custom'>) => void;
  onRange: (range: DateRange) => void;
}) {
  const today = todayParis();

  return (
    <div className="date-filter">
      <div className="date-filter-presets" role="group" aria-label="Franja de fechas">
        {PRESETS.map((option) => (
          <button
            key={option.id}
            type="button"
            className="date-filter-pill"
            aria-pressed={preset === option.id}
            onClick={() => onPreset(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="date-filter-dates">
        <label>
          <span>Desde</span>
          <input
            type="date"
            value={range.from}
            min={RELAUNCH_DATE}
            max={range.to || today}
            onChange={(event) => onRange(clampRange({ from: event.target.value, to: range.to }, today))}
          />
        </label>
        <label>
          <span>Hasta</span>
          <input
            type="date"
            value={range.to}
            min={range.from || RELAUNCH_DATE}
            max={today}
            onChange={(event) => onRange(clampRange({ from: range.from, to: event.target.value }, today))}
          />
        </label>
      </div>
    </div>
  );
}
