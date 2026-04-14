"use server"

import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function getBillHistory() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")

  const bills = await prisma.bill.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          medicine: true
        }
      }
    }
  })

  // Group by date or just return sorted
  return bills.map((bill: typeof bills[number]) => ({
    id: bill.id,
    customerName: bill.customerName,
    customerPhone: bill.customerPhone,
    totalAmount: bill.totalAmount,
    createdAt: bill.createdAt,
    items: bill.items.map((item: typeof bill.items[number]) => ({
      name: item.medicine.name,
      quantity: item.quantity,
      price: item.price
    }))
  }))
}
