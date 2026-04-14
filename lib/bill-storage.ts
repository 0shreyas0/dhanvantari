import { Prisma } from "@prisma/client"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { calculateBillSummaryFromInclusiveTotal, calculateBillSummaryFromItems } from "@/lib/billing"

type BillItemRow = {
  itemId: string | null
  medicineId: string | null
  medicineName: string | null
  quantity: number | null
  price: number | null
}

type BillBaseRow = {
  id: string
  userId: string
  customerName: string | null
  customerPhone: string | null
  totalAmount: number
  createdAt: Date
}

type LegacyBillRow = BillBaseRow & BillItemRow

export type BillWithRelations = BillBaseRow & {
  subtotalAmount: number
  gstRate: number
  gstAmount: number
  items: Array<{
    id: string
    medicineId: string
    quantity: number
    price: number
    medicine: {
      id: string
      name: string
    }
  }>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isMissingBillTaxColumnError(error: unknown) {
  if (!isRecord(error)) return false

  const code = typeof error.code === "string" ? error.code : ""
  const message = typeof error.message === "string" ? error.message : ""

  return (
    code === "P2022" ||
    message.includes("subtotalAmount") ||
    message.includes("gstAmount") ||
    message.includes("gstRate")
  )
}

function normalizeLegacyBill(rows: LegacyBillRow[]): BillWithRelations | null {
  if (rows.length === 0) return null

  const first = rows[0]
  const summary = calculateBillSummaryFromInclusiveTotal(Number(first.totalAmount))

  return {
    id: first.id,
    userId: first.userId,
    customerName: first.customerName,
    customerPhone: first.customerPhone,
    totalAmount: Number(first.totalAmount),
    createdAt: new Date(first.createdAt),
    subtotalAmount: summary.subtotalAmount,
    gstRate: summary.gstRate,
    gstAmount: summary.gstAmount,
    items: rows
      .filter((row) => row.itemId && row.medicineId && row.medicineName)
      .map((row) => ({
        id: row.itemId!,
        medicineId: row.medicineId!,
        quantity: Number(row.quantity ?? 0),
        price: Number(row.price ?? 0),
        medicine: {
          id: row.medicineId!,
          name: row.medicineName!,
        },
      })),
  }
}

export async function getBillWithItems(billId: string, userId?: string) {
  try {
    return await prisma.bill.findFirst({
      where: {
        id: billId,
        ...(userId ? { userId } : {}),
      },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
      },
    })
  } catch (error) {
    if (!isMissingBillTaxColumnError(error)) throw error

    const userFilter = userId ? Prisma.sql`AND b."userId" = ${userId}` : Prisma.empty

    const rows = await prisma.$queryRaw<LegacyBillRow[]>(Prisma.sql`
      SELECT
        b.id,
        b."userId",
        b."customerName",
        b."customerPhone",
        b."totalAmount",
        b."createdAt",
        bi.id AS "itemId",
        bi."medicineId" AS "medicineId",
        m.name AS "medicineName",
        bi.quantity,
        bi.price
      FROM "Bill" b
      LEFT JOIN "BillItem" bi ON bi."billId" = b.id
      LEFT JOIN "Medicine" m ON m.id = bi."medicineId"
      WHERE b.id = ${billId}
      ${userFilter}
      ORDER BY bi.id ASC
    `)

    return normalizeLegacyBill(rows)
  }
}

export async function createBillWithItems(
  userId: string,
  items: { medicineId: string; quantity: number; price: number }[],
  customer?: { name?: string; phone?: string }
) {
  const summary = calculateBillSummaryFromItems(items)

  try {
    return await prisma.bill.create({
      data: {
        userId,
        customerName: customer?.name || null,
        customerPhone: customer?.phone || null,
        subtotalAmount: summary.subtotalAmount,
        gstRate: summary.gstRate,
        gstAmount: summary.gstAmount,
        totalAmount: summary.totalAmount,
        items: {
          create: items.map((item) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    })
  } catch (error) {
    if (!isMissingBillTaxColumnError(error)) throw error

    const billId = randomUUID()

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "Bill" ("id", "userId", "customerName", "customerPhone", "totalAmount", "createdAt")
        VALUES (
          ${billId},
          ${userId},
          ${customer?.name || null},
          ${customer?.phone || null},
          ${summary.totalAmount},
          NOW()
        )
      `)

      for (const item of items) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO "BillItem" ("id", "billId", "medicineId", "quantity", "price")
          VALUES (${randomUUID()}, ${billId}, ${item.medicineId}, ${item.quantity}, ${item.price})
        `)
      }
    })

    return {
      id: billId,
      userId,
      customerName: customer?.name || null,
      customerPhone: customer?.phone || null,
      subtotalAmount: summary.subtotalAmount,
      gstRate: summary.gstRate,
      gstAmount: summary.gstAmount,
      totalAmount: summary.totalAmount,
      createdAt: new Date(),
    }
  }
}
