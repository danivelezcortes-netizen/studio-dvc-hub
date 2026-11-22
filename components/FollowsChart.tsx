'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyFollow } from '@/lib/types';

export function FollowsChart({ days }: { days: DailyFollow[] }) {
  if (days.length === 0) {
    return <p className="quiet">En esta lectura no hay días con follows o unfollows.</p>;
  }
  return (
    <div className="chart-plot" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#E6DDD2" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#4E5B54', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: '#4E5B54', fontSize: 12 }} tickLine={false} axisLine={false} width={32} />
          <Tooltip cursor={{ fill: '#F6F0E8' }} />
          <Legend />
          <Bar dataKey="follows" name="Follows" fill="#2F4A3A" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="unfollows" name="Unfollows" fill="#E9C9C1" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
