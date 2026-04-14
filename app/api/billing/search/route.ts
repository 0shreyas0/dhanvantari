import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { unauthorizedResponse, serverErrorResponse } from "@/lib/server/api"
import { searchProductsForUser } from "@/lib/server/inventory-service"

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const query = request.nextUrl.searchParams.get("q") || ""
    const results = await searchProductsForUser(userId, query)
    return NextResponse.json(results)
  } catch (error) {
    return serverErrorResponse(error)
  }
}
