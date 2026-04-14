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
    const recalledBatches = med.batches.filter(b => b.isRecalled)
    const recalledCount = recalledBatches.length
    const allRecalled = med.batches.length > 0 && recalledCount === med.batches.length

    // Active = not recalled
    const activeBatches = med.batches.filter(b => !b.isRecalled)
    const activeStock = activeBatches.reduce((sum, b) => sum + b.quantity, 0)
    const totalStock = med.batches.reduce((sum, b) => sum + b.quantity, 0)

    // Nearest expiry = earliest across ALL batches with stock > 0 (including recalled)
    const batchesWithStock = [...med.batches]
      .filter(b => b.quantity > 0)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

    const expiryDate =
      batchesWithStock.length > 0
        ? batchesWithStock[0].expiryDate.toISOString()
        : med.batches.length > 0
        ? [...med.batches].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())[0].expiryDate.toISOString()
        : null

    // Price from FEFO of active (non-recalled) batches with stock
    const activeSorted = activeBatches
      .filter(b => b.quantity > 0)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    const fefoPrice =
      activeSorted.length > 0
        ? activeSorted[0].sellingPrice
        : med.batches.length > 0
        ? med.batches[0].sellingPrice
        : 0

    // Status: only "Recalled" if EVERY batch is recalled.
    // Otherwise derive from active (non-recalled) stock.
    let status = "In Stock"
    if (allRecalled) status = "Recalled"
    else if (activeStock === 0) status = "Out of Stock"
    else if (activeStock < med.lowStockThreshold) status = "Low Stock"

    return {
      id: med.id,
      name: med.name,
      barcodes: med.batches.map(b => b.barcode).join(" "),
      category: med.category ?? null,
      description: med.description ?? null,
      totalStock,
      price: fefoPrice,
      status,
      recalledCount,   // > 0 means partial recall — table shows warning chip
      expiryDate,
      batches: med.batches.map(b => ({
        id: b.id,
        barcode: b.barcode,
        batchNumber: b.batchNumber,
        quantity: b.quantity,
        costPrice: b.costPrice,
        sellingPrice: b.sellingPrice,
        expiryDate: b.expiryDate.toISOString(),
        isRecalled: b.isRecalled,
      })),
    }
  })

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
