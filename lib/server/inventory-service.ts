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
    const barcodes = med.batches.map((batch) => batch.barcode).join(" ")

    // Separate batches into sellable (unexpired, non-recalled, qty > 0) vs rest
    const sellableBatches = med.batches
      .filter((batch) => batch.quantity > 0 && batch.expiryDate >= now && !batch.isRecalled)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

    const expiredWithStock = med.batches
      .filter((batch) => batch.quantity > 0 && (batch.expiryDate < now || batch.isRecalled))

    // Bug 2 fix: stock only counts sellable batches
    const stock = sellableBatches.reduce((sum, batch) => sum + batch.quantity, 0)

    // Bug 1 fix: price from FEFO of sellable batches
    const price = sellableBatches.length > 0
      ? sellableBatches[0].sellingPrice
      : med.batches.length > 0
        ? med.batches[0].sellingPrice
        : 0

    let isExpired = false
    let isExpiringSoon = false
    let expiryDate: string | null = null
    let daysToExpiry: number | null = null

    if (sellableBatches.length > 0) {
      // Use the soonest-expiring sellable batch (FEFO)
      const nextBatch = sellableBatches[0]
      expiryDate = nextBatch.expiryDate.toISOString()
      daysToExpiry = daysUntil(nextBatch.expiryDate, now)

      if (nextBatch.expiryDate <= thirtyDaysFromNow) isExpiringSoon = true
    } else if (expiredWithStock.length > 0) {
      // ALL batches with stock are expired or recalled
      isExpired = true
      const latestExpired = [...expiredWithStock].sort(
        (a, b) => b.expiryDate.getTime() - a.expiryDate.getTime()
      )[0]
      expiryDate = latestExpired.expiryDate.toISOString()
      daysToExpiry = daysUntil(latestExpired.expiryDate, now)
    } else if (med.batches.length > 0) {
      // Out of stock — check if the last batch was expired
      const lastBatch = [...med.batches].sort(
        (a, b) => b.expiryDate.getTime() - a.expiryDate.getTime()
      )[0]
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

  // Bug 3 fix: Try exact barcode match first before fuzzy search
  const exactBarcodeMatch = formattedMedicines.filter((m) =>
    m.barcodes.split(" ").some((bc) => bc === query)
  )
  if (exactBarcodeMatch.length > 0) {
    return exactBarcodeMatch.slice(0, 15)
  }

  // Fall back to fuzzy name search (barcode weight removed to avoid fuzzy barcode matches)
  const fuse = new Fuse(formattedMedicines, {
    keys: [
      { name: "name", weight: 1.0 },
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

    const now = new Date()

    // Bug 4 fix: Nearest expiry from unexpired batches with stock, not all batches
    const unexpiredWithStock = [...med.batches]
      .filter((batch) => batch.quantity > 0 && batch.expiryDate >= now && !batch.isRecalled)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

    const expiryDate =
      unexpiredWithStock.length > 0
        ? unexpiredWithStock[0].expiryDate.toISOString()
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

export async function processBillForUser(
  userId: string, 
  items: BillProcessInput[], 
  customer?: CustomerInput, 
  paymentMethod?: string,
  prescriptionUrl?: string
) {
  const now = new Date()

  // Bug 5 fix: Validate + create bill + deduct stock in a single transaction
  // to prevent race conditions with concurrent bills.
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Phase 1: Validate all items have sufficient sellable stock
      for (const item of items) {
        let checkQty = item.quantity
        const batches = await tx.batch.findMany({
          where: { medicineId: item.medicineId, quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        })

        for (const batch of batches) {
          if (checkQty <= 0) break
          if (batch.isRecalled) {
            throw new BillValidationError("SAFETY LOCK: Attempted to sell a RECALLED batch.")
          }
          if (batch.expiryDate < now) {
            // Skip expired batches — don't sell them, but don't block if unexpired stock exists
            continue
          }
          checkQty -= batch.quantity
        }

        if (checkQty > 0) {
          throw new BillValidationError(`Insufficient sellable stock for one or more items.`)
        }
      }

      // Phase 2: Create the bill record
      const bill = await createBillWithItems(userId, items, customer, paymentMethod, prescriptionUrl)

      // Phase 3: Deduct stock (FEFO, skip expired/recalled)
      for (const item of items) {
        let remainingToDeduct = item.quantity
        const batches = await tx.batch.findMany({
          where: { medicineId: item.medicineId, quantity: { gt: 0 } },
          orderBy: { expiryDate: "asc" },
        })

        for (const batch of batches) {
          if (remainingToDeduct <= 0) break
          // Skip expired or recalled batches during deduction
          if (batch.isRecalled || batch.expiryDate < now) continue

          const deduct = Math.min(batch.quantity, remainingToDeduct)
          const serialsToDispense = await tx.serialNumber.findMany({
            where: { batchId: batch.id, status: "ACTIVE" },
            take: deduct,
          })

          if (serialsToDispense.length > 0) {
            await tx.serialNumber.updateMany({
              where: { id: { in: serialsToDispense.map((serial) => serial.id) } },
              data: { status: "DISPENSED", dispensedAt: new Date() },
            })
          }

          await tx.batch.update({
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
    })

    return result
  } catch (error) {
    if (error instanceof BillValidationError) {
      return { success: false as const, error: error.message }
    }
    throw error
  }
}

/** Typed error for bill validation failures (not unexpected crashes) */
class BillValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BillValidationError"
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
