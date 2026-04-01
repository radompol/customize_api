"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function TrendChart({ data }: { data: Array<{ period: string; score: number }> }) {
  return (
    <div className="panel section">
      <div className="section-title">
        <div className="surface-copy">
          <h3>Historical Readiness</h3>
          <span className="table-title">Recent trendline across imported academic periods.</span>
        </div>
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(133, 163, 214, 0.16)" />
            <XAxis dataKey="period" stroke="#98a8c2" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 1]} stroke="#98a8c2" tickLine={false} axisLine={false} />
            <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
            <Line type="monotone" dataKey="score" stroke="#4c6fff" strokeWidth={3} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
