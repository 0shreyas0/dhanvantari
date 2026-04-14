"use client"

import { Badge } from "@/components/ui/badge"
import { getExpiryStatus, ExpirySettings, DEFAULT_EXPIRY_SETTINGS } from "@/lib/expiry"
import { format } from "date-fns"

interface ExpiryBadgeProps {
  expiryDate: Date | string
  settings?: ExpirySettings
}

export function ExpiryBadge({ expiryDate, settings = DEFAULT_EXPIRY_SETTINGS }: ExpiryBadgeProps) {
  const date = new Date(expiryDate)
  const status = getExpiryStatus(date, settings)
  const dateStr = format(date, "yyyy-MM-dd")

  // Simplified Label for the badge
  const shortLabel = status.label
    .replace("Expires in ", "")
    .replace(" day", "d")
    .replace("s", "")
    .replace("OK", "SAFE")

  const s = status.color

  const colorStyles: Record<string, string> = {
    green:  "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    orange: "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400",
    red:    "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 font-bold",
    gray:   "bg-muted/10 border-border/50 text-muted-foreground/50",
  }

  return (
    <div className="inline-flex items-center gap-1.5 group relative cursor-default">
      {/* Date Part */}
      <div className={`h-6 flex items-center px-1.5 rounded-md border border-border/40 bg-muted/5 transition-colors group-hover:bg-muted/10`}>
        <span className={`font-mono text-[11px] font-bold ${s === "gray" ? "line-through opacity-30 text-muted-foreground" : "text-foreground/70"}`}>
          {dateStr}
        </span>
      </div>

      {/* Status Part — Hover only */}
      <Badge
        variant="outline"
        className={`h-5 px-1.5 text-[9px] font-black uppercase tracking-wider border rounded-[4px] shadow-none transition-all duration-200 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 ${colorStyles[s]}`}
      >
        {shortLabel}
      </Badge>

    </div>
  )
}
