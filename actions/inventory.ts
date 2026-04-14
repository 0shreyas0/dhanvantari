"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import Fuse from "fuse.js"
import { generateEAN13 } from "@/lib/barcode"

export async function searchProducts(query: string) {
  if (!query) return []
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  // Fetch all medicines for this user to perform an e-commerce style fuzzy search Memory-side.
  // Extremely fast for thousands of SKUs.
  const medicines = await prisma.medicine.findMany({
    where: { userId },
    include: { batches: true }
  })

  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(now.getDate() + 30)

  const formattedMedicines = medicines.map((med: any) => {
    const stock = med.batches.reduce((sum: number, b: any) => sum + b.quantity, 0)
    const price = med.batches.length > 0 ? med.batches[0].sellingPrice : 0
    
    // Concatenate all batch barcodes for searching
    const barcodes = med.batches.map(b => b.barcode).join(" ")

    const availableBatches = med.batches.filter(b => b.quantity > 0)
    availableBatches.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    
    let isExpired = false
    let isExpiringSoon = false
    let expiryDate: string | null = null
    let daysToExpiry: number | null = null

    if (availableBatches.length > 0) {
      const nextBatch = availableBatches[0]
      expiryDate = nextBatch.expiryDate.toISOString()
      const msPerDay = 1000 * 60 * 60 * 24
      daysToExpiry = Math.floor(
        (new Date(nextBatch.expiryDate).setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0)) / msPerDay
      )
      if (nextBatch.expiryDate < now) {
        isExpired = true
        daysToExpiry = daysToExpiry // will be negative
      } else if (nextBatch.expiryDate <= thirtyDaysFromNow) {
        isExpiringSoon = true
      }
    } else if (med.batches.length > 0 && stock === 0) {
      const lastBatch = [...med.batches].sort((a,b) => b.expiryDate.getTime() - a.expiryDate.getTime())[0]
      if (lastBatch.expiryDate < now) {
          isExpired = true
          expiryDate = lastBatch.expiryDate.toISOString()
      }
    }

    return {
      id: med.id,
      name: med.name,
      barcodes, // Combined barcodes from all batches
      stock,
      price,
      isExpired,
      isExpiringSoon,
      expiryDate,
      daysToExpiry,
    }
  })

  // Initialize powerful Fuzzy Search algorithm
  const fuse = new Fuse(formattedMedicines, {
    keys: [
        { name: 'name', weight: 0.7 }, // Prioritize matching the name
        { name: 'barcodes', weight: 0.3 } // Still allow barcode searches
    ],
    threshold: 0.4, // Allows for a moderate level of typos (0.0 is perfect match, 1.0 is everything matches)
    includeScore: true,
    distance: 100, // How far the typo can be from the start
  })

  // Search and return top 15 results
  const searchResults = fuse.search(query);
  return searchResults.map(result => result.item).slice(0, 15);
}

export async function getMedicineByBarcode(barcode: string) {
  const { userId } = await auth()
  if (!userId) return null

  const batch = await prisma.batch.findFirst({
    where: {
      barcode,
      medicine: { userId }
    },
    include: { medicine: true }
  })

  return batch?.medicine || null
}

export async function processBill(
  items: { medicineId: string, quantity: number, price: number }[],
  customer?: { name?: string, phone?: string }
) {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  // Verify no expired items are being sold (Safety Lock)
  const now = new Date()
  for (const item of items) {
    let checkQty = item.quantity
    const batches = await prisma.batch.findMany({
      where: { medicineId: item.medicineId, quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' }
    })
    
    for (const batch of batches) {
      if (checkQty <= 0) break
      if (batch.isRecalled) {
        return { success: false, error: "SAFETY LOCK: Attempted to sell a RECALLED batch." }
      }
      if (batch.expiryDate < now) {
        return { success: false, error: "SAFETY LOCK: Attempted to sell an EXPIRED batch." }
      }
      checkQty -= batch.quantity
    }
  }

  const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

  const bill = await prisma.bill.create({
    data: {
      userId,
      customerName: customer?.name || null,
      customerPhone: customer?.phone || null,
      totalAmount,
      items: {
        create: items.map(item => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
          price: item.price
        }))
      }
    }
  })

  // Deduct stock from batches (FEFO)
  for (const item of items) {
    let remainingToDeduct = item.quantity
    const batches = await prisma.batch.findMany({
      where: { medicineId: item.medicineId, quantity: { gt: 0 } },
      orderBy: { expiryDate: 'asc' }
    })

    for (const batch of batches) {
      if (remainingToDeduct <= 0) break

      const deduct = Math.min(batch.quantity, remainingToDeduct)
      
      const serialsToDispense = await prisma.serialNumber.findMany({
        where: { batchId: batch.id, status: 'ACTIVE' },
        take: deduct
      })

      if (serialsToDispense.length > 0) {
        await prisma.serialNumber.updateMany({
          where: { id: { in: serialsToDispense.map(s => s.id) } },
          data: { status: 'DISPENSED', dispensedAt: new Date() }
        })
      }

      await prisma.batch.update({
        where: { id: batch.id },
        data: { quantity: batch.quantity - deduct }
      })

      remainingToDeduct -= deduct
    }
  }

  return { success: true, billId: bill.id }
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

  const bill = await prisma.bill.findUnique({
    where: { id: billId, userId },
    include: {
      items: {
        include: {
          medicine: true
        }
      }
    }
  })

  if (!bill) return null

  // Also try to get pharmacy settings for the pharmacy name
  const settings = await prisma.pharmacySettings.findUnique({
    where: { userId }
  })

  return {
    ...bill,
    pharmacyName: settings?.name || "Dhanvantari Pharmacy"
  }
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
  const rows = medicines.flatMap(med => {
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

  for (const row of rows) {
    try {
      const name = row["Medicine Name"]
      if (!name) continue

      // STRICT SYSTEM GENERATION (Ignore CSV columns for these)
      const barcode = Date.now().toString() + Math.floor(Math.random() * 1000).toString()
      const batchNumber = "BAT-" + Math.floor(Math.random() * 1000).toString().padStart(3, '0')

      // Capture available data, default to 0/placeholder if not present
      const quantity = parseInt(row["Stock"]) || 0
      const sellingPrice = parseFloat(row["Selling Price"]) || 0
      const costPrice = row["Cost Price"] ? parseFloat(row["Cost Price"]) : sellingPrice * 0.8
      
      // Default to 1 year from now if expiry isn't found
      const defaultExpiry = new Date()
      defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1)
      const expiry = row["Expiry Date"] ? new Date(row["Expiry Date"]) : defaultExpiry

      // Use a transaction for each row to ensure medicine and batch are synced
      await prisma.$transaction(async (tx: any) => {
          // 1. Find or create medicine by name
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

          // 2. Add batch with strictly generated metadata
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
