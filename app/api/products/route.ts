import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { badRequestResponse, serverErrorResponse, unauthorizedResponse } from "@/lib/server/api"
import { createMedicineForUser, listProductsForUser } from "@/lib/server/inventory-service"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const data = await listProductsForUser(userId)
    return NextResponse.json(data)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const body = await request.json()
    if (!body?.name || !body?.barcode || !body?.initialBatch?.batchNumber) {
      return badRequestResponse("Missing required medicine fields")
    }

    const result = await createMedicineForUser(userId, {
      name: String(body.name),
      barcode: String(body.barcode),
      category: body.category ? String(body.category) : undefined,
      description: body.description ? String(body.description) : undefined,
      lowStockThreshold: Number(body.lowStockThreshold ?? 10),
      initialBatch: {
        batchNumber: String(body.initialBatch.batchNumber),
        quantity: Number(body.initialBatch.quantity ?? 0),
        costPrice: Number(body.initialBatch.costPrice ?? 0),
        sellingPrice: Number(body.initialBatch.sellingPrice ?? 0),
        expiryDate: new Date(body.initialBatch.expiryDate),
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
