import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import {
  badRequestResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@/lib/server/api"
import { getSupabaseAdmin } from "@/lib/server/supabase"
import { updatePharmacyLogoForUser } from "@/lib/server/settings-service"

export const dynamic = "force-dynamic"

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET_NAME ?? "logos"
const STORAGE_PUBLIC = process.env.SUPABASE_STORAGE_BUCKET_PUBLIC === "true"

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return unauthorizedResponse()

  try {
    const formData = await request.formData()
    const logoFile = formData.get("logo") ?? formData.get("file")

    if (!logoFile || typeof (logoFile as Blob).arrayBuffer !== "function") {
      return badRequestResponse("Missing logo file")
    }

    const file = logoFile as File
    if (!file.type?.startsWith("image/")) {
      return badRequestResponse("Logo file must be an image")
    }

    const extension = file.name?.split(".").pop() ?? "png"
    const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`
    const arrayBuffer = await file.arrayBuffer()
    const fileData = new Uint8Array(arrayBuffer)

    const supabaseAdmin = getSupabaseAdmin()
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, fileData, {
        contentType: file.type,
        cacheControl: "3600",
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(path)

    let logoUrl: string | null = publicUrlData?.publicUrl

    if (!logoUrl || !STORAGE_PUBLIC) {
      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 60 * 60 * 24 * 7)

      if (signedUrlError || !signedUrlData?.signedUrl) {
        // If it's private and we can't sign it, we must fail.
        // But if it's supposed to be public and we have a path, the publicUrlData is technically valid (just unverified).
        if (!STORAGE_PUBLIC) {
          return serverErrorResponse(signedUrlError ?? new Error("Unable to create signed URL for logo"))
        }
      } else {
        logoUrl = signedUrlData.signedUrl
      }
    }

    if (logoUrl) {
      await updatePharmacyLogoForUser(userId, logoUrl)
    }

    return NextResponse.json({ logoUrl })
  } catch (error) {
    return serverErrorResponse(error)
  }
}
