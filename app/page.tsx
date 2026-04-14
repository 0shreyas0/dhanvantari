import { auth } from "@clerk/nextjs/server";
import Dashboard from "@/components/Dashboard";
import LandingPage from "@/components/LandingPage";
import { prisma } from "@/lib/prisma";
import { DEFAULT_EXPIRY_SETTINGS } from "@/lib/expiry";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    // ── Fetch medicines + today's bills + recent transactions in parallel ──
    const [medicines, todayBills, recentTransactionsRaw, expirySettingsRaw] = await Promise.all([
      prisma.medicine.findMany({ where: { userId }, include: { batches: true } }),
      prisma.bill.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      prisma.bill.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { items: { include: { medicine: true } } },
      }),
      prisma.expirySettings.findUnique({ where: { userId } }),
    ]);

    // ── Stock health ──────────────────────────────────────────────────────────
    let lowStock = 0, outOfStock = 0, inStock = 0;

    medicines.forEach(med => {
      const stock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      if (stock === 0) outOfStock++;
      else if (stock < med.lowStockThreshold) lowStock++;
      else inStock++;
    });

    const stockHealth = medicines.length > 0 ? inStock / medicines.length : 0;

    // ── ExpirySettings with fallback defaults ─────────────────────────────────
    const expirySettings = expirySettingsRaw
      ? {
          earlyWarningDays: expirySettingsRaw.earlyWarningDays,
          urgentWarningDays: expirySettingsRaw.urgentWarningDays,
          criticalDays: expirySettingsRaw.criticalDays,
        }
      : DEFAULT_EXPIRY_SETTINGS;

    // ── Expiry alerts: fetch everything within earlyWarningDays window ────────
    const earlyDate = new Date();
    earlyDate.setDate(earlyDate.getDate() + expirySettings.earlyWarningDays);

    const expiringBatchesRaw = await prisma.batch.findMany({
      where: {
        medicine: { userId },
        quantity: { gt: 0 },
        expiryDate: { lte: earlyDate },
      },
      include: { medicine: true },
      orderBy: { expiryDate: "asc" },
    });

    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;

    const toAlertItem = (b: typeof expiringBatchesRaw[0]) => ({
      id: b.id,
      medicineId: b.medicineId,
      name: b.medicine.name,
      batchNumber: b.batchNumber,
      expiryDate: b.expiryDate,
      daysRemaining: Math.floor(
        (new Date(b.expiryDate).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / msPerDay
      ),
      quantity: b.quantity,
    });

    const critical = expiringBatchesRaw
      .filter(b => {
        const d = Math.floor((new Date(b.expiryDate).setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0)) / msPerDay);
        return d <= expirySettings.criticalDays;
      })
      .map(toAlertItem);

    const urgent = expiringBatchesRaw
      .filter(b => {
        const d = Math.floor((new Date(b.expiryDate).setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0)) / msPerDay);
        return d > expirySettings.criticalDays && d <= expirySettings.urgentWarningDays;
      })
      .map(toAlertItem);

    const early = expiringBatchesRaw
      .filter(b => {
        const d = Math.floor((new Date(b.expiryDate).setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0)) / msPerDay);
        return d > expirySettings.urgentWarningDays && d <= expirySettings.earlyWarningDays;
      })
      .map(toAlertItem);

    const totalRevenueToday = todayBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalSalesToday = todayBills.length;

    const recentTransactions = recentTransactionsRaw.map(b => ({
      id: b.id,
      amount: b.totalAmount,
      items: b.items.length,
      time: b.createdAt,
      customerName: b.customerName,
    }));

    const stats = {
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
    };

    return <Dashboard stats={stats} />;
  }

  return <LandingPage />;
}
