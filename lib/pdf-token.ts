import { createHmac } from "crypto"

const PDF_SECRET = process.env.PDF_SECRET || "fallback_secret"

/**
 * Generates a tamper-proof HMAC token for a given bill ID.
 * Used to sign secure PDF download links.
 */
export function generatePdfToken(billId: string): string {
  return createHmac("sha256", PDF_SECRET).update(billId).digest("hex")
}

/**
 * Returns the full signed URL for a bill's PDF receipt.
 */
export function getSignedPdfUrl(billId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://dhanvantari-five.vercel.app"
  const token = generatePdfToken(billId)
  return `${base}/api/bill/${billId}/pdf?token=${token}`
}
