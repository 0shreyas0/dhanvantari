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
