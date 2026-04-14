import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/server/api"
import { processBillForUser } from "@/lib/server/inventory-service"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const body = await request.json()
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return badRequestResponse("Bill items are required")
    }

    const result = await processBillForUser(
      userId,
      body.items.map((item: Record<string, unknown>) => ({
        medicineId: String(item.medicineId),
        quantity: Number(item.quantity),
        price: Number(item.price),
      })),
      body.customer
        ? {
            name: body.customer.name ? String(body.customer.name) : undefined,
            phone: body.customer.phone ? String(body.customer.phone) : undefined,
          }
        : undefined
    )

    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
