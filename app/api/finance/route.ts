import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { unauthorizedResponse, serverErrorResponse } from "@/lib/server/api"
import { getFinanceDataForUser } from "@/lib/server/finance-service"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const data = await getFinanceDataForUser(userId)
    return NextResponse.json(data)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
