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
    let totalStock = 0;
    let maxStockCapacityEstimate = medicines.length * 100; // Rough estimate for gauge

    medicines.forEach(med => {
      const stock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
      totalStock += stock;
      if (stock === 0) {
        outOfStock++;
      } else if (stock < med.lowStockThreshold) {
        lowStock++;
      }
    });

    const stockHealth = maxStockCapacityEstimate > 0 ? totalStock / maxStockCapacityEstimate : 0;

    const stats = {
      lowStock,
      outOfStock,
      arrivingStock: 5, // Mock data as requested/implied by "inspiration"
      totalProducts: medicines.length,
      stockHealth: Math.min(stockHealth, 1)
    };

    return <Dashboard stats={stats} />;
  }

  return <LandingPage />;
}
