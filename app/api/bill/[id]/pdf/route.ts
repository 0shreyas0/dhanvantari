import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import fs from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"
import PDFDocument from "pdfkit"
import { getBillWithItems } from "@/lib/bill-storage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// -------------------------------------------------------------------
// Utility: generate and verify HMAC tokens
// -------------------------------------------------------------------
const PDF_SECRET = process.env.PDF_SECRET || "fallback_secret"
const FONT_REGULAR = path.join(process.cwd(), "app/fonts/GoogleSans-Regular.ttf")
const FONT_MEDIUM = path.join(process.cwd(), "app/fonts/GoogleSans-Medium.ttf")
const FONT_BOLD = path.join(process.cwd(), "app/fonts/GoogleSans-Bold.ttf")

export function generatePdfToken(billId: string): string {
  return createHmac("sha256", PDF_SECRET).update(billId).digest("hex")
}

function verifyToken(billId: string, token: string): boolean {
  try {
    const expected = generatePdfToken(billId)
    // timingSafeEqual prevents timing attacks
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected))
  } catch {
    return false
  }
}

// -------------------------------------------------------------------
// GET /api/bill/[id]/pdf?token=<hmac>
// -------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = request.nextUrl.searchParams.get("token")

    // 1. Security check
    if (!token || !verifyToken(id, token)) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // 2. Fetch bill
    const bill = await getBillWithItems(id)

    if (!bill) {
      return new NextResponse("Bill not found", { status: 404 })
    }

    // Fetch pharmacy name from settings
    const settings = await prisma.pharmacySettings.findUnique({
      where: { userId: bill.userId },
    })
    const pharmacyName = settings?.name || "Dhanvantari Pharmacy"

    // 3. Generate PDF in memory
    const chunks: Buffer[] = []
    const regularFont = fs.readFileSync(FONT_REGULAR)
    const boldFont = fs.readFileSync(FONT_BOLD)
    const mediumFont = fs.existsSync(FONT_MEDIUM) ? fs.readFileSync(FONT_MEDIUM) : regularFont

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: "A4", font: regularFont as any })

      doc.registerFont("ReceiptRegular", regularFont)
      doc.registerFont("ReceiptMedium", mediumFont)
      doc.registerFont("ReceiptBold", boldFont)

      doc.on("data", (chunk: Buffer) => chunks.push(chunk))
      doc.on("end", resolve)
      doc.on("error", reject)

      // ---- Pre-load Pharmacy Logo (if any) ----
      let pharmacyLogoBuffer = null
      if (settings?.logoUrl) {
        try {
          const res = await fetch(settings.logoUrl)
          if (res.ok) {
            pharmacyLogoBuffer = Buffer.from(await res.arrayBuffer())
          }
        } catch (e) {
          console.error("Failed to fetch pharmacy logo:", e)
        }
      }

      const dhanvantariLogo = fs.readFileSync(path.join(process.cwd(), "public/logo.png"))

      // ---- Branded Header Decoration ----
      doc.rect(0, 0, 595, 8).fillColor("#0f172a").fill()

      // ---- Header Row (Logos + Name) ----
      doc.moveDown(1.5)
      const headerTop = doc.y

      // Dhanvantari Brand Logo (Left)
      try {
        doc.image(dhanvantariLogo, 50, headerTop, { width: 35 })
      } catch (e) { /* fallback if image invalid */ }

      // Pharmacy Info (Center)
      doc
        .fontSize(22)
        .font("ReceiptBold")
        .fillColor("#0f172a")
        .text(pharmacyName.toUpperCase(), 0, headerTop + 5, { align: "center", characterSpacing: 1 })
      
      // Pharmacy Custom Logo (Right)
      if (pharmacyLogoBuffer) {
        try {
          doc.image(pharmacyLogoBuffer, 510, headerTop, { width: 35 })
        } catch (e) { /* ignore if invalid image */ }
      }

      doc.moveDown(0.2)
      doc
        .fontSize(8)
        .font("ReceiptMedium")
        .fillColor("#64748b")
        .text("OFFICIAL TAX RECEIPT", { align: "center", characterSpacing: 2 })

      if (settings?.address || settings?.phone) {
        doc.moveDown(0.3)
        const storeDetails = [settings?.address, settings?.phone].filter(Boolean).join("  •  ")
        doc
          .fontSize(8)
          .font("ReceiptRegular")
          .fillColor("#94a3b8")
          .text(storeDetails, { align: "center" })
      }
      
      doc.moveDown(1.5)

      // ---- Bill Meta ----
      // ---- Bill Meta Information Row ----
      const metaY = doc.y
      
      // Left Column: Customer Details
      doc.font("ReceiptBold").fontSize(8).fillColor("#94a3b8").text("BILL TO", 50, metaY)
      doc.font("ReceiptBold").fontSize(11).fillColor("#1e293b").text(bill.customerName?.toUpperCase() || "VALUED CUSTOMER", 50, metaY + 12)
      doc.font("ReceiptRegular").fontSize(10).fillColor("#64748b").text(bill.customerPhone || "—", 50, metaY + 26)

      // Right Column: Receipt Details
      doc.font("ReceiptBold").fontSize(8).fillColor("#94a3b8").text("RECEIPT DETAILS", 350, metaY, { align: "right", width: 195 })
      doc.font("ReceiptBold").fontSize(10).fillColor("#1e293b").text(`ID: #${bill.id.slice(-8).toUpperCase()}`, 350, metaY + 12, { align: "right", width: 195 })
      doc.font("ReceiptRegular").fontSize(10).fillColor("#64748b").text(`Date: ${new Date(bill.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 350, metaY + 26, { align: "right", width: 195 })

      doc.moveDown(3)

      // ---- Items Table Header ----
      // ---- Items Table ----
      const tableTop = doc.y
      
      // Table Header Background
      doc.rect(50, tableTop, 495, 24).fillColor("#1e293b").fill()

      // Table Headers
      doc
        .fontSize(9)
        .font("ReceiptBold")
        .fillColor("#ffffff")
        .text("MEDICINE", 65, tableTop + 8, { width: 220 })
        .text("QTY", 280, tableTop + 8, { width: 70, align: "center" })
        .text("UNIT PRICE", 350, tableTop + 8, { width: 90, align: "right" })
        .text("AMOUNT", 440, tableTop + 8, { width: 95, align: "right" })

      // Render Items
      let rowY = tableTop + 24
      doc.font("ReceiptRegular").fontSize(10)

      bill.items.forEach((item, i) => {
        // Alternating row background
        if (i % 2 === 0) {
          doc.rect(50, rowY, 495, 22).fillColor("#f8fafc").fill()
        }

        doc
          .fillColor("#334155")
          .text(item.medicine.name, 65, rowY + 6, { width: 220 })
          .text(String(item.quantity), 280, rowY + 6, { width: 70, align: "center" })
          .text(`\u20b9${item.price.toFixed(2)}`, 350, rowY + 6, { width: 90, align: "right" })
          .text(`\u20b9${(item.price * item.quantity).toFixed(2)}`, 440, rowY + 6, { width: 95, align: "right" })

        rowY += 22
      })

      // ---- Totals Section ----
      doc.moveDown(2)
      const totalsY = doc.y
      
      // Summary Box
      doc.rect(340, totalsY, 205, 85).fillColor("#f1f5f9").fill()
      
      let lineY = totalsY + 12
      doc.font("ReceiptRegular").fontSize(10).fillColor("#64748b")
      doc.text("Subtotal", 355, lineY).text(`\u20b9${bill.subtotalAmount.toFixed(2)}`, 440, lineY, { align: "right", width: 95 })
      
      lineY += 20
      doc.text(`GST (${bill.gstRate.toFixed(0)}%)`, 355, lineY).text(`\u20b9${bill.gstAmount.toFixed(2)}`, 440, lineY, { align: "right", width: 95 })
      
      // Final Total Highlight
      lineY += 22
      doc.rect(340, lineY - 5, 205, 36).fillColor("#0f172a").fill()
      doc.font("ReceiptBold").fontSize(14).fillColor("#ffffff")
      doc.text("TOTAL PAID", 355, lineY + 6).text(`\u20b9${bill.totalAmount.toFixed(2)}`, 440, lineY + 6, { align: "right", width: 95 })

      // ---- Footer Branding ----
      doc
        .fontSize(8)
        .font("ReceiptRegular")
        .fillColor("#94a3b8")
        .text(
          "This is a computer-generated receipt and is valid without a physical signature.",
          50,
          740,
          { align: "center", width: 495 }
        )
      
      doc
        .font("ReceiptBold")
        .fillColor("#0ea5e9")
        .text("Digitized by Dhanvantari", 50, 752, { align: "center", width: 495 })

      doc.end()
    })

    const pdfBuffer = Buffer.concat(chunks)
    const filename = `Receipt-${bill.id.slice(-8).toUpperCase()}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("PDF generation failed:", error)
    return new NextResponse("Failed to generate PDF receipt", { status: 500 })
  }
}
