import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import PageContainer from "@/components/PageContainer";
import MainLayout from "@/components/MainLayout";
import InventoryTable from "@/components/InventoryTable";
import { redirect } from "next/navigation";
import { AddProductDialog } from "@/components/AddProductDialog";
import { getPharmacySettings, getExpirySettings } from "@/actions/settings";
import { DEFAULT_EXPIRY_SETTINGS } from "@/lib/expiry";

export default async function ProductsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [medicines, settings, expirySettingsRaw] = await Promise.all([
    prisma.medicine.findMany({
      where: { userId },
      include: { batches: true },
    }),
    getPharmacySettings(),
    getExpirySettings(),
  ]);

  const pharmacyName = settings?.name || "Pharmacy";
  const expirySettings = expirySettingsRaw
    ? {
        earlyWarningDays: expirySettingsRaw.earlyWarningDays,
        urgentWarningDays: expirySettingsRaw.urgentWarningDays,
        criticalDays: expirySettingsRaw.criticalDays,
      }
    : DEFAULT_EXPIRY_SETTINGS;

  const data = medicines.map(med => {
    const activeBatches = med.batches.filter(b => !b.isRecalled);
    const recalledBatches = med.batches.filter(b => b.isRecalled);
    
    const stock = med.batches.reduce((sum, b) => sum + b.quantity, 0);
    const price = med.batches.length > 0 ? med.batches[0].sellingPrice : 0;
    const hasRecall = recalledBatches.length > 0;
    const batches = med.batches.map(b => b.batchNumber).join(", ");

    // Earliest expiry across all IN-STOCK, non-recalled batches (FEFO)
    const available = med.batches.filter(b => b.quantity > 0 && !b.isRecalled)
    available.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    const expiryDate = available.length > 0
      ? available[0].expiryDate.toISOString()
      : med.batches.length > 0
        ? med.batches.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())[0].expiryDate.toISOString()
        : null

    let status = "In Stock";
    if (hasRecall) {
        status = "Recalled";
    } else if (stock === 0) {
        status = "Out of Stock";
    } else if (stock < med.lowStockThreshold) {
        status = "Low Stock";
    }
    
    return {
      id: med.id,
      name: med.name,
      barcode: med.barcode,
      batch: batches || "N/A",
      stock,
      price,
      status,
      expiryDate,
      rawBatches: med.batches,
    };
  });

  return (
    <PageContainer>
      <MainLayout>
        <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Products</h1>
              <p className="text-muted-foreground mt-2">Manage your inventory.</p>
            </div>
            <AddProductDialog />
        </div>
        <InventoryTable data={data} pharmacyName={pharmacyName} expirySettings={expirySettings} />
      </MainLayout>
    </PageContainer>
  );
}
