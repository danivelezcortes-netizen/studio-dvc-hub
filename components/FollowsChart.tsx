'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailyFollow } from '@/lib/types';

export function FollowsChart({ days }: { days: DailyFollow[] }) {
  if (days.length === 0) {
    return (
      <div className="text-card">
        <p className="quiet">En esta lectura no hay días con follows o unfollows.</p>
      </div>
    );
  }
  return (
    <div className="chart-card">
      <div className="chart-plot" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E5E5E5" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#3D3833', fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#3D3833', fontSize: 12 }} tickLine={false} axisLine={false} width={32} />
            <Tooltip cursor={{ fill: '#F5F5F5' }} />
            <Legend />
            <Bar dataKey="follows" name="Follows" fill="#E7D52B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="unfollows" name="Unfollows" fill="#FF2D9A" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
