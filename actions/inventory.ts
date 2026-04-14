"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import Fuse from "fuse.js"

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

  const formattedMedicines = medicines.map(med => {
    const stock = med.batches.reduce((sum, b) => sum + b.quantity, 0)
    const price = med.batches.length > 0 ? med.batches[0].sellingPrice : 0
    
    const availableBatches = med.batches.filter(b => b.quantity > 0)
    availableBatches.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    
    let isExpired = false
    let isExpiringSoon = false

    if (availableBatches.length > 0) {
      const nextBatch = availableBatches[0]
      if (nextBatch.expiryDate < now) {
        isExpired = true
      } else if (nextBatch.expiryDate <= thirtyDaysFromNow) {
        isExpiringSoon = true
      }
    } else if (med.batches.length > 0 && stock === 0) {
      const lastBatch = [...med.batches].sort((a,b) => b.expiryDate.getTime() - a.expiryDate.getTime())[0]
      if (lastBatch.expiryDate < now) {
          isExpired = true
      }
    }

    return {
      id: med.id,
      name: med.name,
      barcode: med.barcode,
      stock,
      price,
      isExpired,
      isExpiringSoon
    }
  })

  // Initialize powerful Fuzzy Search algorithm
  const fuse = new Fuse(formattedMedicines, {
    keys: [
        { name: 'name', weight: 0.7 }, // Prioritize matching the name
        { name: 'barcode', weight: 0.3 } // Still allow barcode searches
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

  return await prisma.medicine.findFirst({
    where: {
      userId,
      barcode
    }
  })
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

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

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

  const result = await prisma.$transaction(async (tx) => {
    let medicine = await tx.medicine.findFirst({
      where: { userId, barcode }
    })

    if (medicine) {
      // Update existing medicine details if they changed them
      medicine = await tx.medicine.update({
        where: { id: medicine.id },
        data: {
          name,
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
          barcode: barcode,
          category,
          description,
          lowStockThreshold,
        }
      })
    }

    await tx.batch.create({
      data: {
        medicineId: medicine.id,
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
              "Barcode": med.barcode,
              "Category": med.category || "",
              "Batch No.": "N/A",
              "Stock": 0,
              "Selling Price": 0,
              "Expiry Date": "N/A",
              "Status": "Out of Stock"
          }]
      }
      
      return med.batches.map(batch => {
          const isExpired = new Date(batch.expiryDate) < new Date()
          return {
              "Medicine Name": med.name,
              "Barcode": med.barcode,
              "Category": med.category || "",
              "Batch No.": batch.batchNumber,
              "Stock": batch.quantity,
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
      const barcode = row["Barcode"]
      const batchNumber = row["Batch No."] || "B-001"
      const quantity = parseInt(row["Stock"]) || 0
      const price = parseFloat(row["Selling Price"]) || 0
      const expiry = row["Expiry Date"] ? new Date(row["Expiry Date"]) : new Date(Date.now() + 365*24*60*60*1000)

      if (!name || !barcode) continue

      // Use a transaction for each row to ensure medicine and batch are synced
      await prisma.$transaction(async (tx) => {
          // 1. Find or create medicine
          let medicine = await tx.medicine.findUnique({
              where: { barcode_userId: { barcode, userId } }
          })

          if (!medicine) {
              medicine = await tx.medicine.create({
                  data: {
                      name,
                      barcode,
                      userId,
                      category: row["Category"] || ""
                  }
              })
          }

          // 2. Add batch
          await tx.batch.create({
              data: {
                  medicineId: medicine.id,
                  batchNumber,
                  quantity,
                  sellingPrice: price,
                  costPrice: price * 0.8, // Estimate cost if not provided
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
