import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/server/api"
import { addBatchToMedicineForUser } from "@/lib/server/inventory-service"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const { id } = await params
    const body = await request.json()

    if (!body?.batchNumber) {
      return badRequestResponse("Missing required batch fields")
    }

    const result = await addBatchToMedicineForUser(userId, id, {
      barcode: body.barcode ? String(body.barcode) : undefined,
      batchNumber: String(body.batchNumber),
      quantity: Number(body.quantity ?? 0),
      costPrice: Number(body.costPrice ?? 0),
      sellingPrice: Number(body.sellingPrice ?? 0),
      expiryDate: new Date(body.expiryDate),
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
