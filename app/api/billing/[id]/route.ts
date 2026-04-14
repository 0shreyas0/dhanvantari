import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { serverErrorResponse, unauthorizedResponse } from "@/lib/server/api"
import { getBillDetailsForUser } from "@/lib/server/inventory-service"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const { id } = await params
    const bill = await getBillDetailsForUser(userId, id)
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 })
    }

    return NextResponse.json(bill)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
