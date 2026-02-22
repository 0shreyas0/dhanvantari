"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function searchProducts(query: string) {
  if (!query) return []
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const medicines = await prisma.medicine.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: query } },
        { barcode: { contains: query } }
      ]
    },
    include: {
      batches: true
    }
  })

  const now = new Date()
  const thirtyDaysFromNow = new Date()
  thirtyDaysFromNow.setDate(now.getDate() + 30)

  return medicines.map(med => {
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

export async function processBill(items: { medicineId: string, quantity: number, price: number }[]) {
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
      if (batch.expiryDate < now) {
        return { success: false, error: "SAFETY LOCK: Attempted to sell an expired batch." }
      }
      checkQty -= batch.quantity
    }
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const bill = await prisma.bill.create({
    data: {
      userId,
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
      }
    })

    return medicine
  })

  return { success: true, medicine: result }
}
