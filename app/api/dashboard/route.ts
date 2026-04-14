import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { unauthorizedResponse, serverErrorResponse } from "@/lib/server/api"
import { getDashboardDataForUser } from "@/lib/server/dashboard-service"

export async function GET() {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const data = await getDashboardDataForUser(userId)
    return NextResponse.json(data)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
