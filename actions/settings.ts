"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function getPharmacySettings() {
  const { userId } = await auth()
  if (!userId) return null

  let settings = await prisma.pharmacySettings.findUnique({
    where: { userId }
  })

  // Create default if not exists
  if (!settings) {
    settings = await prisma.pharmacySettings.create({
      data: {
        userId,
        name: "My Pharmacy",
        phone: "",
        address: ""
      }
    })
  }

  return settings
}

export async function updatePharmacySettings(data: { name: string; phone?: string; address?: string }) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const settings = await prisma.pharmacySettings.upsert({
    where: { userId },
    update: {
      name: data.name,
      phone: data.phone,
      address: data.address
    },
    create: {
      userId,
      name: data.name,
      phone: data.phone,
      address: data.address
    }
  })

  return { success: true, settings }
}

// ─── Expiry Settings ──────────────────────────────────────────────────────────

export async function getExpirySettings() {
  const { userId } = await auth()
  if (!userId) return null

  let settings = await prisma.expirySettings.findUnique({ where: { userId } })

  if (!settings) {
    settings = await prisma.expirySettings.create({
      data: { userId, earlyWarningDays: 90, urgentWarningDays: 30, criticalDays: 7 },
    })
  }

  return settings
}

export async function updateExpirySettings(data: {
  earlyWarningDays: number
  urgentWarningDays: number
  criticalDays: number
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  // Validate ordering
  if (!(data.criticalDays < data.urgentWarningDays && data.urgentWarningDays < data.earlyWarningDays)) {
    throw new Error("criticalDays < urgentWarningDays < earlyWarningDays must hold")
  }

  const settings = await prisma.expirySettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  })

  return { success: true, settings }
}

