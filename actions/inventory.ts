"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { generateEAN13 } from "@/lib/barcode"
import {
  getBillDetailsForUser,
  getMedicineByBarcodeForUser,
  processBillForUser,
  searchProductsForUser,
} from "@/lib/server/inventory-service"

export async function searchProducts(query: string) {
  if (!query) return []
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return searchProductsForUser(userId, query)
}

export async function getMedicineByBarcode(barcode: string) {
  const { userId } = await auth()
  if (!userId) return null
  return getMedicineByBarcodeForUser(userId, barcode)
}

export async function processBill(
  items: { medicineId: string, quantity: number, price: number }[],
  customer?: { name?: string, phone?: string }
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return processBillForUser(userId, items, customer)
}
// ...existing code...

export async function createMedicine(data: {
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
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const { name, barcode, category, description, lowStockThreshold, initialBatch } = data

  const result = await prisma.$transaction(async (tx: any) => {
    let medicine = await tx.medicine.findFirst({
      where: { userId, name } // Searching by name as fallback unique key for medicine type
    })

    if (medicine) {
      // Update existing medicine details
      medicine = await tx.medicine.update({
        where: { id: medicine.id },
        data: {
          category,
          description,
          lowStockThreshold,
        }
      })
    } else {
      medicine = await tx.medicine.create({
        data: {
          userId,
          name,
          category,
          description,
          lowStockThreshold,
        }
      })
    }

    await tx.batch.create({
      data: {
        medicineId: medicine.id,
        barcode: barcode, // Barcode goes to batch
        batchNumber: initialBatch.batchNumber,
        quantity: initialBatch.quantity,
        costPrice: initialBatch.costPrice,
        sellingPrice: initialBatch.sellingPrice,
        expiryDate: initialBatch.expiryDate,
        serialNumbers: {
            create: Array.from({ length: initialBatch.quantity }).map(() => ({
                code: crypto.randomUUID()
            }))
        }
      }
    })

    return medicine
  })

  return { success: true, medicine: result }
}

// ─── Create medicine (no batch required) ──────────────────────────────────────

export async function createMedicineOnly(data: {
  name: string
  category?: string
  description?: string
  lowStockThreshold: number
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const medicine = await prisma.medicine.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      description: data.description,
      lowStockThreshold: data.lowStockThreshold,
    },
  })

  return { success: true, medicine }
}

// ─── Add a batch to an existing medicine ──────────────────────────────────────

export async function addBatchToMedicine(
  medicineId: string,
  data: {
    barcode?: string       // scan: associates the real manufacturer barcode with the medicine
    batchNumber: string
    quantity: number
    costPrice: number
    sellingPrice: number
    expiryDate: Date
  }
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  return await prisma.$transaction(async (tx) => {
    // Verify ownership
    const medicine = await tx.medicine.findFirst({
      where: { id: medicineId, userId },
    })
    if (!medicine) throw new Error("Medicine not found or unauthorized")

    // Create the batch + generate serial numbers
    const batch = await tx.batch.create({
      data: {
        medicineId,
        barcode: data.barcode || generateEAN13(), // Every batch gets a barcode (internal if not provided)
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

// ─── Auto-generate next batch details ─────────────────────────────────────────

export async function getAutoBatchDetails(medicineId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  // Find the latest batch for this medicine to determine the next serial number
  const lastBatch = await prisma.batch.findFirst({
    where: { 
      medicineId,
      medicine: { userId }
    },
    orderBy: { createdAt: 'desc' }
  })

  let nextBatchNumber = "BAT-001"
  if (lastBatch && lastBatch.batchNumber) {
    // Try to parse BAT-XXX and increment
    const match = lastBatch.batchNumber.match(/^BAT-(\d+)$/)
    if (match) {
      const currentNum = parseInt(match[1])
      nextBatchNumber = `BAT-${(currentNum + 1).toString().padStart(3, '0')}`
    } else {
      // Fallback: timestamp based if last batch didn't follow the pattern
      nextBatchNumber = `BN-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`
    }
  }

  return {
    batchNumber: nextBatchNumber,
    barcode: generateEAN13()
  }
}

export async function toggleRecallBatch(batchId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { medicine: true }
  })

  // Ensure user owns this medicine
  if (!batch || batch.medicine.userId !== userId) {
    throw new Error("Unauthorized or Batch Not Found")
  }

  const updatedBatch = await prisma.batch.update({
    where: { id: batchId },
    data: { isRecalled: !batch.isRecalled }
  })

  return { success: true, isRecalled: updatedBatch.isRecalled }
}

// ─── Delete a medicine and all its associated data ─────────────────────────────

export async function deleteMedicine(medicineId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  // Verify ownership first
  const medicine = await prisma.medicine.findFirst({
    where: { id: medicineId, userId },
  })
  if (!medicine) throw new Error("Medicine not found or unauthorized")

  // Cascade delete in dependency order
  await prisma.$transaction(async (tx) => {
    // 1. Serial numbers (belong to batches of this medicine)
    await tx.serialNumber.deleteMany({
      where: { batch: { medicineId } },
    })
    // 2. Batches
    await tx.batch.deleteMany({ where: { medicineId } })
    // 3. Bill line items referencing this medicine (historical — warn user in UI)
    await tx.billItem.deleteMany({ where: { medicineId } })
    // 4. Finally the medicine itself
    await tx.medicine.delete({ where: { id: medicineId } })
  })

  return { success: true }
}

export async function getBillDetails(billId: string) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  return getBillDetailsForUser(userId, billId)
}
export async function purgeUserData(targetUserId: string) {
  const { userId } = await auth()
  
  // Security check: Only allow a user to purge their OWN data 
  // (unless you want to add an Admin check here later)
  if (!userId || userId !== targetUserId) {
    throw new Error("Unauthorized to purge this user's data")
  }

  console.log(`Starting deep purge for user: ${targetUserId}`)

  // Use a transaction to ensure everything or nothing is deleted
  return await prisma.$transaction(async (tx) => {
    // 1. Delete Settings
    await tx.pharmacySettings.deleteMany({ where: { userId: targetUserId } })

    // 2. Delete Bills (and items via relation)
    // Note: Since BillItem is linked, we delete them first
    await tx.billItem.deleteMany({
      where: {
        bill: { userId: targetUserId }
      }
    })
    await tx.bill.deleteMany({ where: { userId: targetUserId } })

    // 3. Delete Medicines (and batches/serial numbers)
    // We catch SerialNumbers linked to Batches of this user's medicines
    await tx.serialNumber.deleteMany({
       where: {
         batch: {
             medicine: { userId: targetUserId }
         }
       }
    })
    await tx.batch.deleteMany({
      where: {
        medicine: { userId: targetUserId }
      }
    })
    await tx.medicine.deleteMany({ where: { userId: targetUserId } })

    // 4. Delete Vendors
    await tx.vendor.deleteMany({ where: { userId: targetUserId } })

    return { success: true, message: "All user data has been permanently purged." }
  })
}

export async function exportInventoryToCSV() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const medicines = await prisma.medicine.findMany({
    where: { userId },
    include: {
      batches: true
    }
  })

  // Flatten the data for CSV
  const rows = medicines.flatMap((med: any) => {
      if (med.batches.length === 0) {
              return [{
                  "Medicine Name": med.name,
                  "Barcode": "N/A",
                  "Category": med.category || "",
                  "Description": med.description || "",
                  "Batch No.": "N/A",
                  "Stock": 0,
                  "Cost Price": 0,
                  "Selling Price": 0,
                  "Expiry Date": "N/A",
                  "Status": "Out of Stock"
              }]
      }
      
      return med.batches.map((batch: any) => {
          const isExpired = new Date(batch.expiryDate) < new Date()
          return {
              "Medicine Name": med.name,
              "Barcode": batch.barcode,
              "Category": med.category || "",
              "Description": med.description || "",
              "Batch No.": batch.batchNumber,
              "Stock": batch.quantity,
              "Cost Price": batch.costPrice,
              "Selling Price": batch.sellingPrice,
              "Expiry Date": new Date(batch.expiryDate).toLocaleDateString(),
              "Status": isExpired ? "Expired" : (batch.quantity === 0 ? "Out of Stock" : "In Stock")
          }
      })
  })

  return rows
}

export async function importInventoryFromCSV(rows: any[]) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  let successCount = 0
  let errorCount = 0

  // Helper to parse DD/MM/YYYY or standard formats
  const parseFlexibleDate = (dateStr: string): Date => {
    if (!dateStr || dateStr.includes('dd/mm/yyyy') || dateStr.includes('##')) {
        const d = new Date()
        d.setFullYear(d.getFullYear() + 1)
        return d
    }

    // Try standard parsing first
    let d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d

    // Try DD/MM/YYYY
    const parts = dateStr.split(/[/.-]/)
    if (parts.length === 3) {
      const day = parseInt(parts[0])
      const month = parseInt(parts[1]) - 1 // 0-indexed
      const year = parseInt(parts[2])
      
      // Handle 2-digit years if needed, but usually 4 is expected
      if (year < 100) {
          const fullYear = year + (year > 50 ? 1900 : 2000)
          d = new Date(fullYear, month, day)
      } else {
          d = new Date(year, month, day)
      }
      
      if (!isNaN(d.getTime())) return d
    }

    const fallback = new Date()
    fallback.setFullYear(fallback.getFullYear() + 1)
    return fallback
  }

  // Helper to parse numbers safely
  const parseNum = (val: any, fallback = 0) => {
    if (typeof val === 'string') {
        // Strip non-numeric except decimal
        const clean = val.replace(/[^0-9.]/g, '')
        const parsed = parseFloat(clean)
        return isNaN(parsed) ? fallback : parsed
    }
    return typeof val === 'number' ? val : fallback
  }

  for (const row of rows) {
    try {
      const name = row["Medicine Name"]
      if (!name || name.toLowerCase().includes("medicine name")) continue

      // Use a consistent internal barcode/batch generation policy
      const barcode = Date.now().toString().slice(-8) + Math.floor(Math.random() * 100000).toString().padStart(5, '0')
      const batchNumber = "B-" + Math.floor(Math.random() * 1000).toString().padStart(3, '0')

      const quantity = Math.floor(parseNum(row["Stock"]))
      const sellingPrice = parseNum(row["Selling Price"])
      // Cost price fallback: 80% of selling price if missing
      const costPrice = row["Cost Price"] ? parseNum(row["Cost Price"]) : sellingPrice * 0.8
      const expiry = parseFlexibleDate(row["Expiry Date"])

      await prisma.$transaction(async (tx: any) => {
          let medicine = await tx.medicine.findFirst({
              where: { name, userId }
          })

          if (!medicine) {
              medicine = await tx.medicine.create({
                  data: {
                      name,
                      userId,
                      category: row["Category"] || "",
                      description: row["Description"] || ""
                  }
              })
          }

          await tx.batch.create({
              data: {
                  medicineId: medicine.id,
                  barcode,
                  batchNumber,
                  quantity,
                  sellingPrice,
                  costPrice,
                  expiryDate: expiry
              }
          })
      })
      successCount++
    } catch (e) {
      console.error("Failed to import row", row, e)
      errorCount++
    }
  }

  return { success: true, successCount, errorCount }
}

export async function updateBatch(batchId: string, data: {
  barcode?: string
  batchNumber?: string
  quantity?: number
  costPrice?: number
  sellingPrice?: number
  expiryDate?: Date
}) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const batch = await prisma.batch.update({
    where: { id: batchId },
    data
  })

  return batch
}
