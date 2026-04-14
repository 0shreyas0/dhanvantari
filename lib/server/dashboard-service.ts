import { prisma } from "@/lib/prisma"
import { DEFAULT_EXPIRY_SETTINGS } from "@/lib/expiry"
import { getOrCreateExpirySettings } from "@/lib/server/settings-service"

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfToday() {
  const date = new Date()
  date.setHours(23, 59, 59, 999)
  return date
}

function daysUntil(date: Date, now = new Date()) {
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.floor(
    (new Date(date).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / msPerDay
  )
}

export async function getDashboardDataForUser(userId: string) {
  const [medicines, todayBills, recentTransactionsRaw, expirySettingsRaw] = await Promise.all([
    prisma.medicine.findMany({ where: { userId }, include: { batches: true } }),
    prisma.bill.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfToday(),
          lte: endOfToday(),
        },
      },
    }),
    prisma.bill.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { items: { include: { medicine: true } } },
    }),
    getOrCreateExpirySettings(userId),
  ])

  let lowStock = 0
  let outOfStock = 0
  let inStock = 0

  medicines.forEach((medicine) => {
    const stock = medicine.batches.reduce((sum, batch) => sum + batch.quantity, 0)
    if (stock === 0) outOfStock++
    else if (stock < medicine.lowStockThreshold) lowStock++
    else inStock++
  })

  const stockHealth = medicines.length > 0 ? inStock / medicines.length : 0
  const expirySettings = expirySettingsRaw
    ? {
        earlyWarningDays: expirySettingsRaw.earlyWarningDays,
        urgentWarningDays: expirySettingsRaw.urgentWarningDays,
        criticalDays: expirySettingsRaw.criticalDays,
      }
    : DEFAULT_EXPIRY_SETTINGS

  const earlyDate = new Date()
  earlyDate.setDate(earlyDate.getDate() + expirySettings.earlyWarningDays)

  const expiringBatchesRaw = await prisma.batch.findMany({
    where: {
      medicine: { userId },
      quantity: { gt: 0 },
      expiryDate: { lte: earlyDate },
    },
    include: { medicine: true },
    orderBy: { expiryDate: "asc" },
  })

  const now = new Date()

  const toAlertItem = (batch: typeof expiringBatchesRaw[number]) => ({
    id: batch.id,
    medicineId: batch.medicineId,
    name: batch.medicine.name,
    batchNumber: batch.batchNumber,
    expiryDate: batch.expiryDate.toISOString(),
    daysRemaining: daysUntil(batch.expiryDate, now),
    quantity: batch.quantity,
  })

  const critical = expiringBatchesRaw
    .filter((batch) => daysUntil(batch.expiryDate, now) <= expirySettings.criticalDays)
    .map(toAlertItem)

  const urgent = expiringBatchesRaw
    .filter((batch) => {
      const days = daysUntil(batch.expiryDate, now)
      return days > expirySettings.criticalDays && days <= expirySettings.urgentWarningDays
    })
    .map(toAlertItem)

  const early = expiringBatchesRaw
    .filter((batch) => {
      const days = daysUntil(batch.expiryDate, now)
      return days > expirySettings.urgentWarningDays && days <= expirySettings.earlyWarningDays
    })
    .map(toAlertItem)

  const totalRevenueToday = todayBills.reduce((sum, bill) => sum + bill.totalAmount, 0)
  const totalSalesToday = todayBills.length

  const recentTransactions = recentTransactionsRaw.map((bill) => ({
    id: bill.id,
    amount: bill.totalAmount,
    items: bill.items.length,
    time: bill.createdAt.toISOString(),
    customerName: bill.customerName,
  }))

  return {
    inStock,
    lowStock,
    outOfStock,
    totalProducts: medicines.length,
    stockHealth: Math.min(stockHealth, 1),
    totalRevenueToday,
    totalSalesToday,
    recentTransactions,
    expiryAlerts: { critical, urgent, early },
    expirySettings,
  }
}
