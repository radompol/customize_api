"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function ForecastChart({
  actual,
  forecast
}: {
  actual: Array<{ period: string; score: number }>;
  forecast: Array<{ period: string; score: number }>;
}) {
  const combined = [
    ...actual.map((point) => ({ ...point, actualScore: point.score, forecastScore: null })),
    ...forecast.map((point) => ({ ...point, actualScore: null, forecastScore: point.score }))
  ];

  return (
    <div className="panel section">
      <div className="section-title">
        <div className="surface-copy">
          <h3>Forecast</h3>
          <span className="table-title">Actual performance against projected readiness direction.</span>
        </div>
      </div>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={combined}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(133, 163, 214, 0.16)" />
            <XAxis dataKey="period" stroke="#98a8c2" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 1]} stroke="#98a8c2" tickLine={false} axisLine={false} />
            <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
            <Legend />
            <Line type="monotone" dataKey="actualScore" name="Actual" stroke="#4dd39b" strokeWidth={3} />
            <Line
              type="monotone"
              dataKey="forecastScore"
              name="Forecast"
              stroke="#ff6b7d"
              strokeDasharray="5 4"
              strokeWidth={3}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
