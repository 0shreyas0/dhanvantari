// lib/expiry.ts — Pure utility, works on both client and server

export interface ExpirySettings {
  earlyWarningDays: number  // e.g. 90 — yellow
  urgentWarningDays: number // e.g. 30 — orange
  criticalDays: number      // e.g.  7 — red
}

export const DEFAULT_EXPIRY_SETTINGS: ExpirySettings = {
  earlyWarningDays: 90,
  urgentWarningDays: 30,
  criticalDays: 7,
}

export type ExpiryColor = 'green' | 'yellow' | 'orange' | 'red' | 'gray'

export interface ExpiryStatus {
  label: string
  color: ExpiryColor
  daysRemaining: number
}

/**
 * Returns a status object for a given expiry date + settings.
 * daysRemaining < 0 means already expired.
 */
export function getExpiryStatus(
  expiryDate: Date,
  settings: ExpirySettings = DEFAULT_EXPIRY_SETTINGS
): ExpiryStatus {
  const now = new Date()
  // Floor to day boundary so "today" counts as 0 days remaining
  const msPerDay = 1000 * 60 * 60 * 24
  const daysRemaining = Math.floor(
    (new Date(expiryDate).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / msPerDay
  )

  if (daysRemaining < 0) {
    return { label: 'Expired', color: 'gray', daysRemaining }
  }

  if (daysRemaining <= settings.criticalDays) {
    return {
      label: daysRemaining === 0
        ? 'Expires today!'
        : `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      color: 'red',
      daysRemaining,
    }
  }

  if (daysRemaining <= settings.urgentWarningDays) {
    return {
      label: `Expires in ${daysRemaining} days`,
      color: 'orange',
      daysRemaining,
    }
  }

  if (daysRemaining <= settings.earlyWarningDays) {
    return {
      label: `Expires in ${daysRemaining} days`,
      color: 'yellow',
      daysRemaining,
    }
  }

  return { label: 'OK', color: 'green', daysRemaining }
}
