import Fuse from "fuse.js"
import { prisma } from "@/lib/prisma"
import { generateEAN13 } from "@/lib/barcode"
import { createBillWithItems, getBillWithItems } from "@/lib/bill-storage"
import { getSignedPdfUrl } from "@/lib/pdf-token"
import { DEFAULT_EXPIRY_SETTINGS } from "@/lib/expiry"
import { getOrCreateExpirySettings, getOrCreatePharmacySettings } from "@/lib/server/settings-service"

export type BillProcessInput = {
  medicineId: string
  quantity: number
  price: number
}

export type CustomerInput = {
  name?: string
  phone?: string
}

function daysUntil(date: Date, now = new Date()) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor(
    (new Date(date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / msPerDay
  )
}

export async function searchProductsForUser(userId: string, query: string) {
  if (!query) return []

  const medicines = await prisma.medicine.findMany({
    where: { userId },
    include: { batches: true },
  })

  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(now.getDate() + 30)

  const formattedMedicines = medicines.map((med) => {
    const stock = med.batches.reduce((sum, batch) => sum + batch.quantity, 0)
    const price = med.batches.length > 0 ? med.batches[0].sellingPrice : 0
    const barcodes = med.batches.map((batch) => batch.barcode).join(" ")

    const availableBatches = med.batches
      .filter((batch) => batch.quantity > 0)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

    let isExpired = false
    let isExpiringSoon = false
    let expiryDate: string | null = null
    let daysToExpiry: number | null = null

    if (availableBatches.length > 0) {
      const nextBatch = availableBatches[0]
      expiryDate = nextBatch.expiryDate.toISOString()
      daysToExpiry = daysUntil(nextBatch.expiryDate, now)

      if (nextBatch.expiryDate < now) isExpired = true
      else if (nextBatch.expiryDate <= thirtyDaysFromNow) isExpiringSoon = true
    } else if (med.batches.length > 0 && stock === 0) {
      const lastBatch = [...med.batches].sort((a, b) => b.expiryDate.getTime() - a.expiryDate.getTime())[0]
      if (lastBatch.expiryDate < now) {
        isExpired = true
        expiryDate = lastBatch.expiryDate.toISOString()
      }
    }

    return {
      id: med.id,
      name: med.name,
      barcodes,
      stock,
      price,
      isExpired,
      isExpiringSoon,
      expiryDate,
      daysToExpiry,
    }
  })

  const fuse = new Fuse(formattedMedicines, {
    keys: [
      { name: "name", weight: 0.7 },
      { name: "barcodes", weight: 0.3 },
    ],
    threshold: 0.4,
    includeScore: true,
    distance: 100,
  })

  return fuse.search(query).map((result) => result.item).slice(0, 15)
}

export async function listProductsForUser(userId: string) {
  const [medicines, pharmacySettings, expirySettingsRaw] = await Promise.all([
    prisma.medicine.findMany({
      where: { userId },
      include: { batches: true },
      orderBy: { name: "asc" },
    }),
    getOrCreatePharmacySettings(userId),
    getOrCreateExpirySettings(userId),
  ])

  const expirySettings = expirySettingsRaw
    ? {
        earlyWarningDays: expirySettingsRaw.earlyWarningDays,
        urgentWarningDays: expirySettingsRaw.urgentWarningDays,
        criticalDays: expirySettingsRaw.criticalDays,
      }
    : DEFAULT_EXPIRY_SETTINGS

  const products = medicines.map((med) => {
    const recalledBatches = med.batches.filter((batch) => batch.isRecalled)
    const recalledCount = recalledBatches.length
    const allRecalled = med.batches.length > 0 && recalledCount === med.batches.length
    const activeBatches = med.batches.filter((batch) => !batch.isRecalled)
    const activeStock = activeBatches.reduce((sum, batch) => sum + batch.quantity, 0)
    const totalStock = med.batches.reduce((sum, batch) => sum + batch.quantity, 0)

    const batchesWithStock = [...med.batches]
      .filter((batch) => batch.quantity > 0)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

    const expiryDate =
      batchesWithStock.length > 0
        ? batchesWithStock[0].expiryDate.toISOString()
        : med.batches.length > 0
          ? [...med.batches].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())[0].expiryDate.toISOString()
          : null

    const activeSorted = activeBatches
      .filter((batch) => batch.quantity > 0)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

    const fefoPrice =
      activeSorted.length > 0
        ? activeSorted[0].sellingPrice
        : med.batches.length > 0
          ? med.batches[0].sellingPrice
          : 0

    let status = "In Stock"
    if (allRecalled) status = "Recalled"
    else if (activeStock === 0) status = "Out of Stock"
    else if (activeStock < med.lowStockThreshold) status = "Low Stock"

    return {
      id: med.id,
      name: med.name,
      barcodes: med.batches.map((batch) => batch.barcode).join(" "),
      category: med.category,
      description: med.description,
      totalStock,
      activeStock,
      price: fefoPrice,
      lowStockThreshold: med.lowStockThreshold,
      status,
      recalledCount,
      expiryDate,
      batches: med.batches.map((batch) => ({
        id: batch.id,
        barcode: batch.barcode,
        batchNumber: batch.batchNumber,
        quantity: batch.quantity,
        costPrice: batch.costPrice,
        sellingPrice: batch.sellingPrice,
        expiryDate: batch.expiryDate.toISOString(),
        isRecalled: batch.isRecalled,
      })),
    }
  })

  return {
    pharmacyName: pharmacySettings.name || "Pharmacy",
    expirySettings,
    products,
  }
}

export async function processBillForUser(userId: string, items: BillProcessInput[], customer?: CustomerInput) {
  const now = new Date()

  for (const item of items) {
    let checkQty = item.quantity
    const batches = await prisma.batch.findMany({
      where: { medicineId: item.medicineId, quantity: { gt: 0 } },
      orderBy: { expiryDate: "asc" },
    })

    for (const batch of batches) {
      if (checkQty <= 0) break
      if (batch.isRecalled) return { success: false as const, error: "SAFETY LOCK: Attempted to sell a RECALLED batch." }
      if (batch.expiryDate < now) return { success: false as const, error: "SAFETY LOCK: Attempted to sell an EXPIRED batch." }
      checkQty -= batch.quantity
    }
  }

  const bill = await createBillWithItems(userId, items, customer)

  for (const item of items) {
    let remainingToDeduct = item.quantity
    const batches = await prisma.batch.findMany({
      where: { medicineId: item.medicineId, quantity: { gt: 0 } },
      orderBy: { expiryDate: "asc" },
    })

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break

      const deduct = Math.min(batch.quantity, remainingToDeduct)
      const serialsToDispense = await prisma.serialNumber.findMany({
        where: { batchId: batch.id, status: "ACTIVE" },
        take: deduct,
      })

      if (serialsToDispense.length > 0) {
        await prisma.serialNumber.updateMany({
          where: { id: { in: serialsToDispense.map((serial) => serial.id) } },
          data: { status: "DISPENSED", dispensedAt: new Date() },
        })
      }

      await prisma.batch.update({
        where: { id: batch.id },
        data: { quantity: batch.quantity - deduct },
      })

      remainingToDeduct -= deduct
    }
  }

  return {
    success: true as const,
    billId: bill.id,
    pdfUrl: getSignedPdfUrl(bill.id),
  }
}

export async function getBillDetailsForUser(userId: string, billId: string) {
  const [bill, settings] = await Promise.all([
    getBillWithItems(billId, userId),
    prisma.pharmacySettings.findUnique({ where: { userId } }),
  ])

  if (!bill) return null

  return {
    ...bill,
    createdAt: bill.createdAt.toISOString(),
    items: bill.items.map((item) => ({
      id: item.id,
      medicineId: item.medicineId,
      quantity: item.quantity,
      price: item.price,
      medicine: {
        id: item.medicine.id,
        name: item.medicine.name,
      },
    })),
    pharmacyName: settings?.name || "Dhanvantari Pharmacy",
  }
}

export async function getMedicineByBarcodeForUser(userId: string, barcode: string) {
  const batch = await prisma.batch.findFirst({
    where: {
      barcode,
      medicine: { userId },
    },
    include: { medicine: true },
  })

  return batch?.medicine || null
}

export async function createMedicineForUser(userId: string, data: {
  name: string
  barcode: string
  category?: string
  description?: string
  lowStockThreshold: number
  initialBatch: {
    batchNumber: string
    quantity: number
    costPrice: number
    sellingPrice: number
    expiryDate: Date
  }
}) {
  const { name, barcode, category, description, lowStockThreshold, initialBatch } = data

  const medicine = await prisma.$transaction(async (tx) => {
    let existingMedicine = await tx.medicine.findFirst({
      where: { userId, name },
    })

    if (existingMedicine) {
      existingMedicine = await tx.medicine.update({
        where: { id: existingMedicine.id },
        data: {
          category,
          description,
          lowStockThreshold,
        },
      })
    } else {
      existingMedicine = await tx.medicine.create({
        data: {
          userId,
          name,
          category,
          description,
          lowStockThreshold,
        },
      })
    }

    await tx.batch.create({
      data: {
        medicineId: existingMedicine.id,
        barcode,
        batchNumber: initialBatch.batchNumber,
        quantity: initialBatch.quantity,
        costPrice: initialBatch.costPrice,
        sellingPrice: initialBatch.sellingPrice,
        expiryDate: initialBatch.expiryDate,
        serialNumbers: {
          create: Array.from({ length: initialBatch.quantity }).map(() => ({
            code: crypto.randomUUID(),
          })),
        },
      },
    })

    return existingMedicine
  })

  return { success: true, medicine }
}

export async function addBatchToMedicineForUser(
  userId: string,
  medicineId: string,
  data: {
    barcode?: string
    batchNumber: string
    quantity: number
    costPrice: number
    sellingPrice: number
    expiryDate: Date
  }
) {
  return prisma.$transaction(async (tx) => {
    const medicine = await tx.medicine.findFirst({
      where: { id: medicineId, userId },
    })

    if (!medicine) throw new Error("Medicine not found or unauthorized")

    const batch = await tx.batch.create({
      data: {
        medicineId,
        barcode: data.barcode || generateEAN13(),
        batchNumber: data.batchNumber,
        quantity: data.quantity,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        expiryDate: data.expiryDate,
        serialNumbers: {
          create: Array.from({ length: data.quantity }).map(() => ({
            code: crypto.randomUUID(),
          })),
        },
      },
    })

    return { success: true, batch }
  })
}

export async function toggleRecallBatchForUser(userId: string, batchId: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { medicine: true },
  })

  if (!batch || batch.medicine.userId !== userId) {
    throw new Error("Unauthorized or Batch Not Found")
  }

  const updatedBatch = await prisma.batch.update({
    where: { id: batchId },
    data: { isRecalled: !batch.isRecalled },
  })

  return { success: true, isRecalled: updatedBatch.isRecalled }
}
