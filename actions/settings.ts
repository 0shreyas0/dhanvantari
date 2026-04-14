"use server"

import { auth } from "@clerk/nextjs/server"
import {
  getOrCreateExpirySettings,
  getOrCreatePharmacySettings,
  updateExpirySettingsForUser,
  updatePharmacySettingsForUser,
} from "@/lib/server/settings-service"

export async function getPharmacySettings() {
  const { userId } = await auth()
  if (!userId) return null
  return getOrCreatePharmacySettings(userId)
}

export async function updatePharmacySettings(data: { name: string; phone?: string; address?: string; logoUrl?: string }) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const settings = await updatePharmacySettingsForUser(userId, data)

  return { success: true, settings }
}

// ─── Expiry Settings ──────────────────────────────────────────────────────────

export async function getExpirySettings() {
  const { userId } = await auth()
  if (!userId) return null
  return getOrCreateExpirySettings(userId)
}

export async function updateExpirySettings(data: {
  earlyWarningDays: number
  urgentWarningDays: number
  criticalDays: number
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const settings = await updateExpirySettingsForUser(userId, data)

  return { success: true, settings }
}
