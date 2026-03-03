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
