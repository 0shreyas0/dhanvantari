import { auth } from "@clerk/nextjs/server";
import Dashboard from "@/components/Dashboard";
import LandingPage from "@/components/LandingPage";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    // Fetch stats
    const medicines = await prisma.medicine.findMany({
      include: {
        batches: true
      }
    });

    let lowStock = 0;
    let outOfStock = 0;
    let inStock = 0;
    let totalStock = 0;

    medicines.forEach(med => {
      const stock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      totalStock += stock;
      if (stock === 0) {
        outOfStock++;
      } else if (stock < med.lowStockThreshold) {
        lowStock++;
      } else {
        inStock++;
      }
    });

    // Stock Health: Percentage of unique medicines that are neither out of stock nor low on stock.
    const stockHealth = medicines.length > 0 ? inStock / medicines.length : 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayBills = await prisma.bill.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    const totalRevenueToday = todayBills.reduce((sum, bill) => sum + bill.totalAmount, 0);
    const totalSalesToday = todayBills.length;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringBatchesRaw = await prisma.batch.findMany({
      where: {
        medicine: { userId },
        quantity: { gt: 0 },
        expiryDate: { lte: thirtyDaysFromNow }
      },
      include: {
        medicine: true
      },
      orderBy: { expiryDate: 'asc' },
      take: 5
    });

    const expiringBatches = expiringBatchesRaw.map(b => ({
        id: b.id,
        name: b.medicine.name,
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantity: b.quantity
    }));

    const recentTransactionsRaw = await prisma.bill.findMany({
       where: { userId },
       orderBy: { createdAt: 'desc' },
       take: 5,
       include: {
           items: {
               include: { medicine: true }
           }
       }
    });

    const recentTransactions = recentTransactionsRaw.map(b => ({
      id: b.id,
      amount: b.totalAmount,
      items: b.items.length,
      time: b.createdAt,
      customerName: b.customerName
    }));

    const stats = {
      inStock,
      lowStock,
      outOfStock,
      totalProducts: medicines.length,
      stockHealth: Math.min(stockHealth, 1),
      totalRevenueToday,
      totalSalesToday,
      expiringBatches,
      recentTransactions
    };

    return <Dashboard stats={stats} />;
  }

  return <LandingPage />;
}
