"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface StockPercentageProps {
  percentage: number // 0 to 1
}

export default function StockPercentage({ percentage }: StockPercentageProps) {
  // Gauge chart using Pie
  // We want a semi-circle or near-full circle.
  // Let's do a semi-circle for variety, or full circle gauge.
  // Medicotary used a gauge.
  
  const value = Math.max(0, Math.min(100, percentage * 100));
  
  const data = [
    { name: "Score", value: value, color: "#5E48E8" },
    { name: "Remaining", value: 100 - value, color: "#e2e8f0" }, // muted color
  ]

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-card border border-border rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">Catalog Availability</h3>
      <div className="h-48 w-48 relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              cornerRadius={4}
            >
              <Cell key="score" fill="#5E48E8" />
              <Cell key="remaining" fill="var(--muted)" className="opacity-20" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[10%] text-center">
             <span className="text-3xl font-bold text-foreground">{Math.round(value)}%</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-4 text-center">
        % of unique SKUs adequately stocked
      </p>
    </div>
  )
}
