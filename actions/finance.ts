"use server"

import { auth } from "@clerk/nextjs/server"
import { getFinanceDataForUser } from "@/lib/server/finance-service"

export async function getBillHistory() {
  const { userId } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const data = await getFinanceDataForUser(userId)
  return data.bills.map((bill) => ({
    id: bill.id,
    customerName: bill.customerName,
    customerPhone: bill.customerPhone,
    totalAmount: bill.totalAmount,
    createdAt: bill.createdAt,
    items: bill.items.map((item) => ({
      name: item.medicineName,
      quantity: item.quantity,
      price: item.price,
    })),
  }))
}
