import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { serverErrorResponse, unauthorizedResponse } from "@/lib/server/api"
import { toggleRecallBatchForUser } from "@/lib/server/inventory-service"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const { id } = await params
    const result = await toggleRecallBatchForUser(userId, id)
    return NextResponse.json(result)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
