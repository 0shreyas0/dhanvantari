"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getExpiryStatus, ExpirySettings } from "@/lib/expiry"
import Link from "next/link"
import { format } from "date-fns"

export interface ExpiryAlertBatch {
  id: string
  medicineId: string
  name: string
  batchNumber: string
  expiryDate: Date | string
  daysRemaining: number
  quantity: number
}

interface ExpiryAlertsCardProps {
  critical: ExpiryAlertBatch[]
  urgent: ExpiryAlertBatch[]
  early: ExpiryAlertBatch[]
  settings: ExpirySettings
}

function AlertSection({
  label,
  emoji,
  color,
  items,
  defaultOpen = false,
}: {
  label: string
  emoji: string
  color: string
  items: ExpiryAlertBatch[]
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  if (items.length === 0) return null

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors text-left ${color}`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <span>{emoji}</span>
          {label}
          <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-current/10 bg-opacity-10 border border-current/20">
            {items.length}
          </span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 opacity-60" /> : <ChevronRight className="h-4 w-4 opacity-60" />}
      </button>

      {open && (
        <div className="divide-y divide-border/40">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Batch: <span className="font-mono">{item.batchNumber}</span>
                  &nbsp;·&nbsp;
                  {item.daysRemaining <= 0
                    ? <span className="text-destructive font-medium">Expired {Math.abs(item.daysRemaining)}d ago</span>
                    : <span>{item.daysRemaining} day{item.daysRemaining === 1 ? "" : "s"} left</span>
                  }
                  &nbsp;·&nbsp;
                  Stock: <span className="font-medium">{item.quantity}</span>
                </p>
              </div>
              <Link href="/products" passHref>
                <Button variant="outline" size="sm" className="ml-3 h-7 text-xs gap-1 shrink-0">
                  View <ExternalLink className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExpiryAlertsCard({ critical, urgent, early, settings }: ExpiryAlertsCardProps) {
  const totalCount = critical.length + urgent.length + early.length
  const isEmpty = totalCount === 0

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 px-5 py-4 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏳</span>
          <h3 className="font-semibold text-foreground">Expiry Alerts</h3>
        </div>
        {!isEmpty && (
          <span className="text-xs font-medium px-2.5 py-1 bg-destructive/10 text-destructive rounded-full">
            {totalCount} item{totalCount !== 1 ? "s" : ""} need attention
          </span>
        )}
        {isEmpty && (
          <span className="text-xs font-medium px-2.5 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full">
            All clear
          </span>
        )}
      </div>

      {/* Body */}
      {isEmpty ? (
        <div className="p-10 flex flex-col items-center text-center text-muted-foreground">
          <ShieldCheck className="h-10 w-10 text-green-500 mb-3 opacity-80" />
          <p className="text-sm font-medium">All stock is within safe expiry range ✅</p>
          <p className="text-xs mt-1">
            Showing medicines expiring within {settings.earlyWarningDays} days
          </p>
        </div>
      ) : (
        <div>
          <AlertSection
            label={`Critical (within ${settings.criticalDays} days)`}
            emoji="🔴"
            color="text-destructive"
            items={critical}
            defaultOpen={true}
          />
          <AlertSection
            label={`Urgent (within ${settings.urgentWarningDays} days)`}
            emoji="🟠"
            color="text-orange-600 dark:text-orange-400"
            items={urgent}
            defaultOpen={true}
          />
          <AlertSection
            label={`Early Warning (within ${settings.earlyWarningDays} days)`}
            emoji="🟡"
            color="text-yellow-600 dark:text-yellow-400"
            items={early}
            defaultOpen={false}
          />
        </div>
      )}
    </div>
  )
}
