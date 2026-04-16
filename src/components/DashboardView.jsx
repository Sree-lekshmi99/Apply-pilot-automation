import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { computeDashboardData } from "../utils/analytics";

const TICK_INTERVAL = { "7d": 0, "14d": 1, "30d": 4, "90d": 13, all: 13 };

export default function DashboardView({ applications }) {
  const [range, setRange] = useState("30d");
  const { chartData, totalApps, totalContacts } = useMemo(
    () => computeDashboardData(applications, range),
    [applications, range]
  );

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8 border-b border-stone-400 pb-2">
        <h2 className="text-2xl" style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}>
          Dashboard
        </h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="border border-stone-900 bg-stone-100 px-3 py-2 text-xs uppercase tracking-wider focus:outline-none cursor-pointer"
        >
          <option value="7d">Last 7 days</option>
          <option value="14d">Last 14 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="border-2 border-stone-900 bg-stone-50 px-6 py-5">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">Applications</div>
          <div
            className="text-5xl font-bold"
            style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}
          >
            {totalApps}
          </div>
        </div>
        <div className="border-2 border-stone-900 bg-stone-50 px-6 py-5">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-2">People Contacted</div>
          <div
            className="text-5xl font-bold"
            style={{ fontFamily: "'Libre Caslon Display', Georgia, serif" }}
          >
            {totalContacts}
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-20 text-stone-500 italic">No application data yet.</div>
      ) : (
        <div className="border-2 border-stone-900 bg-stone-50 px-6 pt-5 pb-4">
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-5">Activity Over Time</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d6d3d1" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fill: "#78716c" }}
                axisLine={false}
                tickLine={false}
                interval={TICK_INTERVAL[range] ?? 13}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", fill: "#78716c" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid #1c1917",
                  borderRadius: 0,
                  fontSize: 12,
                  fontFamily: "inherit",
                  background: "#fafaf9",
                }}
                cursor={{ fill: "#e7e5e4" }}
              />
              <Legend
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", paddingTop: 12 }}
              />
              <Bar dataKey="applications" name="Applications" fill="#1c1917" radius={[2, 2, 0, 0]} maxBarSize={28} />
              <Bar dataKey="contacts" name="People Contacted" fill="#9f1239" radius={[2, 2, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </main>
  );
}
