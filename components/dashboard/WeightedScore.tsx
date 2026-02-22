"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface WeightedScoreProps {
  lowStock: number
  outOfStock: number
  arrivingStock: number
}

export default function WeightedScore({ lowStock, outOfStock, arrivingStock }: WeightedScoreProps) {
  const data = [
    { name: "Low stock", value: lowStock, color: "#489BE8" },
    { name: "Arriving stock", value: arrivingStock, color: "#31D0AA" },
    { name: "Out of stock", value: outOfStock, color: "#E85B81" },
  ]

  // Filter out zero values to avoid rendering empty segments or labels for them
  const activeData = data.filter(d => d.value > 0);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">Weighted Score</h3>
      <div className="h-48 w-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text or Icon could go here */}
      </div>

      <div className="flex gap-4 mt-6">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm font-medium text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
