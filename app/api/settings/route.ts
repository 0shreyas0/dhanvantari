import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/server/api"
import {
  getOrCreateExpirySettings,
  getOrCreatePharmacySettings,
  updateExpirySettingsForUser,
  updatePharmacySettingsForUser,
} from "@/lib/server/settings-service"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const [pharmacy, expiry] = await Promise.all([
      getOrCreatePharmacySettings(userId),
      getOrCreateExpirySettings(userId),
    ])

    return NextResponse.json({ pharmacy, expiry })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.pharmacy) {
      updates.pharmacy = await updatePharmacySettingsForUser(userId, {
        name: String(body.pharmacy.name ?? "My Pharmacy"),
        phone: body.pharmacy.phone ? String(body.pharmacy.phone) : undefined,
        address: body.pharmacy.address ? String(body.pharmacy.address) : undefined,
        logoUrl: body.pharmacy.logoUrl ? String(body.pharmacy.logoUrl) : undefined,
      })
    }

    if (body.expiry) {
      updates.expiry = await updateExpirySettingsForUser(userId, {
        earlyWarningDays: Number(body.expiry.earlyWarningDays),
        urgentWarningDays: Number(body.expiry.urgentWarningDays),
        criticalDays: Number(body.expiry.criticalDays),
      })
    }

    if (Object.keys(updates).length === 0) {
      return badRequestResponse("No settings payload provided")
    }

    return NextResponse.json(updates)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
