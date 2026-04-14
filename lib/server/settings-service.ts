import { prisma } from "@/lib/prisma"

export type PharmacySettingsInput = {
  name: string
  phone?: string
  address?: string
  logoUrl?: string
}

export type ExpirySettingsInput = {
  earlyWarningDays: number
  urgentWarningDays: number
  criticalDays: number
}

export async function getOrCreatePharmacySettings(userId: string) {
  let settings = await prisma.pharmacySettings.findUnique({
    where: { userId },
  })

  if (!settings) {
    settings = await prisma.pharmacySettings.create({
      data: {
        userId,
        name: "My Pharmacy",
        phone: "",
        address: "",
      },
    })
  }

  return settings
}

export async function updatePharmacySettingsForUser(userId: string, data: PharmacySettingsInput) {
  return prisma.pharmacySettings.upsert({
    where: { userId },
    update: {
      name: data.name,
      phone: data.phone,
      address: data.address,
      logoUrl: data.logoUrl,
    },
    create: {
      userId,
      name: data.name,
      phone: data.phone,
      address: data.address,
      logoUrl: data.logoUrl,
    },
  })
}

export async function getOrCreateExpirySettings(userId: string) {
  let settings = await prisma.expirySettings.findUnique({
    where: { userId },
  })

  if (!settings) {
    settings = await prisma.expirySettings.create({
      data: {
        userId,
        earlyWarningDays: 90,
        urgentWarningDays: 30,
        criticalDays: 7,
      },
    })
  }

  return settings
}

export async function updateExpirySettingsForUser(userId: string, data: ExpirySettingsInput) {
  if (!(data.criticalDays < data.urgentWarningDays && data.urgentWarningDays < data.earlyWarningDays)) {
    throw new Error("criticalDays < urgentWarningDays < earlyWarningDays must hold")
  }

  return prisma.expirySettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  })
}
