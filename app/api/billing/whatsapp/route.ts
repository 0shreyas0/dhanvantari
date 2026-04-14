import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/server/api"
import { prisma } from "@/lib/prisma"
import { sendWhatsAppReceipt } from "@/actions/whatsapp"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const body = await request.json()
    const billId = typeof body?.billId === "string" ? body.billId : null
    const customerPhone = typeof body?.customerPhone === "string" ? body.customerPhone : null
    const customerName = typeof body?.customerName === "string" ? body.customerName : "Customer"
    const totals = body?.totals
    const items = body?.items

    if (!billId || !customerPhone) {
      return badRequestResponse("Bill ID and customer phone are required")
    }

    const settings = await prisma.pharmacySettings.findUnique({ where: { userId } })
    const pharmacyName = settings?.name || "Pharmacy"

    const result = await sendWhatsAppReceipt(
      customerPhone,
      customerName,
      billId,
      totals,
      items,
      pharmacyName
    )

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
