import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/prisma"
import PDFDocument from "pdfkit"

// -------------------------------------------------------------------
// Utility: generate and verify HMAC tokens
// -------------------------------------------------------------------
const PDF_SECRET = process.env.PDF_SECRET || "fallback_secret"

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
  { params }: { params: { id: string } }
) {
  const { id } = params
  const token = request.nextUrl.searchParams.get("token")

  // 1. Security check
  if (!token || !verifyToken(id, token)) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  // 2. Fetch bill
  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      items: { include: { medicine: true } },
    },
  })

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

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" })

    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", resolve)
    doc.on("error", reject)

    // ---- Header ----
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(pharmacyName.toUpperCase(), { align: "center" })
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor("#555")
      .text("Official Tax Receipt — Digitized by Dhanvantari", { align: "center" })
    doc.moveDown()

    // ---- Divider ----
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#cccccc")
      .stroke()
    doc.moveDown(0.5)

    // ---- Bill Meta ----
    const metaY = doc.y
    doc.fontSize(10).fillColor("#333")
    doc.text(`Bill To: ${bill.customerName || "Valued Customer"}`, 50, metaY)
    doc.text(`Phone: ${bill.customerPhone || "—"}`, 50)
    doc.fontSize(10)
      .text(`Receipt ID: #${bill.id.slice(-8).toUpperCase()}`, 350, metaY, { align: "right", width: 195 })
    doc.text(`Date: ${new Date(bill.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 350, undefined, { align: "right", width: 195 })

    doc.moveDown(1.5)

    // ---- Items Table Header ----
    const tableTop = doc.y
    doc
      .rect(50, tableTop, 495, 20)
      .fillColor("#0f172a")
      .fill()

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("white")
      .text("Medicine", 60, tableTop + 5, { width: 220 })
      .text("Qty", 280, tableTop + 5, { width: 70, align: "center" })
      .text("Unit Price", 350, tableTop + 5, { width: 90, align: "right" })
      .text("Amount", 440, tableTop + 5, { width: 95, align: "right" })

    // ---- Items ----
    let rowY = tableTop + 25
    doc.font("Helvetica").fillColor("#333").fontSize(10)

    bill.items.forEach((item, i) => {
      const rowBg = i % 2 === 0 ? "#f8fafc" : "#ffffff"
      doc.rect(50, rowY, 495, 20).fillColor(rowBg).fill()

      doc
        .fillColor("#1e293b")
        .text(item.medicine.name, 60, rowY + 5, { width: 220 })
        .text(String(item.quantity), 280, rowY + 5, { width: 70, align: "center" })
        .text(`\u20b9${item.price.toFixed(2)}`, 350, rowY + 5, { width: 90, align: "right" })
        .text(`\u20b9${(item.price * item.quantity).toFixed(2)}`, 440, rowY + 5, { width: 95, align: "right" })

      rowY += 20
    })

    // ---- Total ----
    doc.moveDown(0.5)
    doc
      .moveTo(50, rowY + 5)
      .lineTo(545, rowY + 5)
      .strokeColor("#e2e8f0")
      .stroke()

    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text(`Total Paid: \u20b9${bill.totalAmount.toFixed(2)}`, 50, rowY + 15, { align: "right" })

    // ---- Footer ----
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#94a3b8")
      .text(
        "This is a computer-generated receipt and is valid without a signature. Powered by Dhanvantari.",
        50,
        760,
        { align: "center", width: 495 }
      )

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
}
