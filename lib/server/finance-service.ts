import { prisma } from "@/lib/prisma"
import { getSignedPdfUrl } from "@/lib/pdf-token"

export async function getFinanceDataForUser(userId: string) {
  const [billsRaw, allBatches] = await Promise.all([
    prisma.bill.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
      },
    }),
    prisma.batch.findMany({
      where: {
        medicine: { userId },
      },
    }),
  ])

  const now = new Date()
  const expiredBatches = allBatches.filter((batch) => batch.expiryDate < now && batch.quantity > 0 && !batch.isRecalled)
  const recalledBatches = allBatches.filter((batch) => batch.isRecalled && batch.quantity > 0)
  const expiredLoss = expiredBatches.reduce((sum, batch) => sum + batch.quantity * batch.costPrice, 0)
  const recalledLoss = recalledBatches.reduce((sum, batch) => sum + batch.quantity * batch.costPrice, 0)

  const bills = billsRaw.map((bill) => ({
    id: bill.id,
    customerName: bill.customerName,
    customerPhone: bill.customerPhone,
    totalAmount: bill.totalAmount,
    subtotalAmount: bill.subtotalAmount,
    gstRate: bill.gstRate,
    gstAmount: bill.gstAmount,
    createdAt: bill.createdAt.toISOString(),
    items: bill.items.map((item) => ({
      medicineId: item.medicineId,
      medicineName: item.medicine.name,
      quantity: item.quantity,
      price: item.price,
    })),
    itemsText: bill.items.map((item) => `${item.medicine.name} x${item.quantity}`).join(", "),
    pdfUrl: getSignedPdfUrl(bill.id),
  }))

  const totalRevenue = bills.reduce((sum, bill) => sum + bill.totalAmount, 0)
  const averageOrderValue = bills.length > 0 ? totalRevenue / bills.length : 0

  return {
    summary: {
      totalRevenue,
      averageOrderValue,
      expiredLoss,
      recalledLoss,
      totalLoss: expiredLoss + recalledLoss,
      totalBills: bills.length,
    },
    bills,
  }
}
