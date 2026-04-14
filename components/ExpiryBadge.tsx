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

  const tooltipText =
    status.daysRemaining < 0
      ? `Expired ${Math.abs(status.daysRemaining)} day${Math.abs(status.daysRemaining) === 1 ? '' : 's'} ago`
      : status.daysRemaining === 0
        ? "Expires today!"
        : `${status.daysRemaining} days remaining`

  // Class map per color
  const colorClasses: Record<string, string> = {
    green:
      "border-green-200 text-green-700 dark:text-green-400 dark:border-green-500/30 bg-green-50/50 dark:bg-green-900/10",
    yellow:
      "bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-600/40",
    orange:
      "bg-orange-500 border-orange-500 text-white dark:bg-orange-600 dark:border-orange-600",
    red: "", // Handled by destructive variant below
    gray:
      "bg-muted/60 text-muted-foreground border-border line-through decoration-muted-foreground/60",
  }

  const variant =
    status.color === "red"
      ? "destructive"
      : "outline"

  return (
    <div className="relative group inline-flex">
      <Badge
        variant={variant}
        className={`text-xs font-normal gap-1 ${status.color !== "red" ? colorClasses[status.color] : ""}`}
      >
        <span className={status.color === "gray" ? "line-through" : ""}>{dateStr}</span>
        <span className="opacity-60">·</span>
        <span>{status.label}</span>
      </Badge>

      {/* Hover tooltip */}
      <div
        className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-2.5 py-1.5 rounded-md bg-popover border border-border
          text-xs font-medium text-popover-foreground shadow-md
          whitespace-nowrap pointer-events-none z-50
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
        "
      >
        {tooltipText}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-border" />
      </div>
    </div>
  )
}
